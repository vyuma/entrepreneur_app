"""ISBN から書誌情報を引き、共有本棚に登録する。

外部APIは openBD（日本の書籍に強い・キー不要）を先に見て、
見つからなければ Google Books を使う。どちらも失敗したら
タイトルだけ手入力で登録できるよう、エラーを返して呼び出し側に任せる。
"""

import logging
import threading
import time
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings

from app.models.book import Book, BookRegistration, BookReview
from app.models.user import User

logger = logging.getLogger(__name__)

OPENBD_URL = "https://api.openbd.jp/v1/get"
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
# 国会図書館のサムネイルは同一サイトの Referer が無いと WAF に弾かれるため、
# ブラウザから直リンクできない。書影はフロントの中継API
# (/api/book-cover/{isbn}) がサーバー側で取得して配るので、
# ここでは「実際に直接読めるURL」だけを保存し、無ければ None にしておく。
NDL_THUMBNAIL_PREFIX = "https://ndlsearch.ndl.go.jp/thumbnail/"
TIMEOUT_SECONDS = 8.0
# 同じ ISBN を何度も外部に問い合わせないためのキャッシュ
CACHE_TTL_SECONDS = 60 * 60 * 24

_lock = threading.Lock()
_cache: dict[str, dict[str, Any]] = {}


class BookError(Exception):
    """ISBN が不正、または書誌情報が見つからないとき。"""


# --- ISBN の正規化 ---


def normalize_isbn(raw: str) -> str:
    """ハイフンや空白を除き、10桁なら13桁に変換して返す。

    書籍のバーコードは 978/979 で始まる13桁（日本の書籍は下段に価格用の
    192... から始まる別のバーコードがあるが、それは ISBN ではない）。
    """
    digits = "".join(ch for ch in (raw or "") if ch.isdigit() or ch in "Xx")
    if len(digits) == 10:
        digits = _isbn10_to_13(digits)
    if len(digits) != 13:
        raise BookError("ISBNは10桁または13桁で入力してください")
    if not digits.startswith(("978", "979")):
        raise BookError(
            "書籍のバーコードではありません（978/979 で始まるものを読み取ってください）"
        )
    if not _valid_isbn13(digits):
        raise BookError("ISBNの読み取りに失敗しました。もう一度お試しください")
    return digits


def _isbn10_to_13(isbn10: str) -> str:
    core = "978" + isbn10[:9]
    return core + _isbn13_check_digit(core)


def _isbn13_check_digit(first12: str) -> str:
    total = sum(
        int(ch) * (1 if i % 2 == 0 else 3) for i, ch in enumerate(first12[:12])
    )
    return str((10 - total % 10) % 10)


def _valid_isbn13(isbn13: str) -> bool:
    return _isbn13_check_digit(isbn13[:12]) == isbn13[12]


# --- 外部API ---


def _cached(isbn: str) -> dict[str, Any] | None:
    with _lock:
        entry = _cache.get(isbn)
        if entry and time.time() - entry["at"] < CACHE_TTL_SECONDS:
            return entry["data"]
    return None


def _store(isbn: str, data: dict[str, Any]) -> None:
    with _lock:
        _cache[isbn] = {"data": data, "at": time.time()}


def _from_openbd(isbn: str) -> dict[str, Any] | None:
    with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
        res = client.get(OPENBD_URL, params={"isbn": isbn})
        res.raise_for_status()
        items = res.json()

    if not items or items[0] is None:
        return None

    item = items[0]
    summary = item.get("summary") or {}
    title = (summary.get("title") or "").strip()
    if not title:
        return None

    # 内容紹介は onix 側にしか無いことが多い
    description = None
    try:
        collateral = (item.get("onix") or {}).get("CollateralDetail") or {}
        for text in collateral.get("TextContent") or []:
            if text.get("Text"):
                description = text["Text"].strip()
                break
    except Exception:  # 構造が想定と違っても致命的ではない
        logger.debug("openBD の内容紹介を読めませんでした isbn=%s", isbn)

    return {
        "isbn13": isbn,
        "title": title,
        "authors": (summary.get("author") or "").strip() or None,
        "publisher": (summary.get("publisher") or "").strip() or None,
        "published_date": (summary.get("pubdate") or "").strip() or None,
        "cover_url": (summary.get("cover") or "").strip() or None,
        "description": description,
        "source": "openBD",
    }


def _from_google_books(isbn: str) -> dict[str, Any] | None:
    params: dict[str, str] = {"q": f"isbn:{isbn}"}
    # キーがあれば付ける。無くても動くが、共有IPだと 429 を返されやすい
    if settings.GOOGLE_BOOKS_API_KEY:
        params["key"] = settings.GOOGLE_BOOKS_API_KEY
        params["country"] = "JP"

    with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
        res = client.get(GOOGLE_BOOKS_URL, params=params)
        res.raise_for_status()
        payload = res.json()

    items = payload.get("items") or []
    if not items:
        return None

    info = items[0].get("volumeInfo") or {}
    title = (info.get("title") or "").strip()
    if not title:
        return None

    links = info.get("imageLinks") or {}
    cover = links.get("thumbnail") or links.get("smallThumbnail")
    if cover:
        # http だと混在コンテンツで表示できないため https に寄せる
        cover = cover.replace("http://", "https://")

    authors = info.get("authors") or []
    return {
        "isbn13": isbn,
        "title": title,
        "authors": "、".join(authors) or None,
        "publisher": (info.get("publisher") or "").strip() or None,
        "published_date": (info.get("publishedDate") or "").strip() or None,
        "cover_url": cover,
        "description": (info.get("description") or "").strip() or None,
        "source": "Google Books",
    }


def is_fallback_cover(url: str | None) -> bool:
    """ブラウザから直接読めない書影URLか。

    以前は国会図書館のURLを保存していたが、直リンクでは 403 になるため
    「書影なし」と同じ扱いにして引き直しの対象にする。
    """
    return bool(url) and url.startswith(NDL_THUMBNAIL_PREFIX)


def lookup(isbn: str, force: bool = False) -> dict[str, Any]:
    """ISBN から書誌情報を取得する。見つからなければ BookError。

    force=True でキャッシュを無視して取り直す（書影が未取得の本を
    登録し直したときなど、新しく書影が付いている可能性がある場合に使う）。
    """
    isbn = normalize_isbn(isbn)

    cached = None if force else _cached(isbn)
    if cached is not None:
        return cached

    for fetch in (_from_openbd, _from_google_books):
        try:
            data = fetch(isbn)
        except httpx.HTTPStatusError as exc:
            # レート制限などは想定内。次の候補に進む
            logger.info(
                "書誌API %s が %s を返しました isbn=%s",
                fetch.__name__,
                exc.response.status_code,
                isbn,
            )
            continue
        except Exception:
            logger.warning("書誌情報の取得に失敗しました isbn=%s", isbn, exc_info=True)
            continue
        if data:
            _store(isbn, data)
            return data

    raise BookError(
        "この ISBN の本が見つかりませんでした。タイトルを入力して登録できます"
    )


# --- 本棚 ---


def refresh_metadata(db: Session, book: Book) -> Book:
    """既にある本の書影と、空いている項目を取り直す。

    最初に登録した時点では書影が無く、あとから出版社が登録することがある。
    そのため登録し直されたタイミングで引き直し、実物の書影が取れていれば
    保険のURLから差し替える。タイトルは手入力されている場合があるので触らない。
    """
    # 実物の書影がまだ無いときだけキャッシュを無視して取り直す
    need_cover = not book.cover_url or is_fallback_cover(book.cover_url)

    try:
        data = lookup(book.isbn13, force=need_cover)
    except BookError:
        return book
    except Exception:
        logger.warning("書誌情報の引き直しに失敗しました isbn=%s", book.isbn13, exc_info=True)
        return book

    changed = False
    cover = data.get("cover_url")
    # 保険のURLしか無い状態から実物が取れたときだけ差し替える
    if cover and need_cover and not is_fallback_cover(cover):
        book.cover_url = cover
        changed = True
    elif cover and not book.cover_url:
        book.cover_url = cover
        changed = True

    # 空いている項目だけ埋める（既存の値は上書きしない）
    for field in ("authors", "publisher", "published_date", "description"):
        value = data.get(field)
        if value and not getattr(book, field):
            setattr(book, field, value)
            changed = True

    if changed:
        db.commit()
        db.refresh(book)
    return book


def get_or_create_book(
    db: Session, user: User, isbn: str, fallback_title: str | None = None
) -> Book:
    """ISBN の本を取得する。無ければ書誌情報を引いて作る。

    既にある本なら、書影が未取得のときに引き直してから返す。
    """
    isbn13 = normalize_isbn(isbn)

    book = db.query(Book).filter(Book.isbn13 == isbn13).first()
    if book is not None:
        return refresh_metadata(db, book)

    try:
        data = lookup(isbn13)
    except BookError:
        # 外部で見つからなくても、タイトルが手入力されていれば登録を通す
        if not (fallback_title or "").strip():
            raise
        data = {
            "isbn13": isbn13,
            "title": fallback_title.strip(),
            "authors": None,
            "publisher": None,
            "published_date": None,
            "cover_url": None,
            "description": None,
        }

    book = Book(
        isbn13=data["isbn13"],
        title=data["title"][:300],
        authors=(data.get("authors") or None),
        publisher=(data.get("publisher") or None),
        published_date=(data.get("published_date") or None),
        cover_url=(data.get("cover_url") or None),
        description=(data.get("description") or None),
        added_by=user.id,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


def register(
    db: Session,
    user: User,
    isbn: str,
    comment: str | None = None,
    fallback_title: str | None = None,
) -> tuple[Book, bool]:
    """本棚に登録する。戻り値は (本, 新規登録か)。"""
    book = get_or_create_book(db, user, isbn, fallback_title)

    existing = (
        db.query(BookRegistration)
        .filter(
            BookRegistration.user_id == user.id,
            BookRegistration.book_id == book.id,
        )
        .first()
    )
    if existing is not None:
        return book, False

    db.add(
        BookRegistration(
            user_id=user.id,
            book_id=book.id,
            comment=(comment or "").strip() or None,
        )
    )
    db.commit()
    return book, True


def unregister(db: Session, user: User, book_id: str) -> None:
    """自分の登録だけ外す。本そのものと他の人の登録は残る。"""
    entry = (
        db.query(BookRegistration)
        .filter(
            BookRegistration.user_id == user.id,
            BookRegistration.book_id == book_id,
        )
        .first()
    )
    if entry is None:
        raise BookError("この本は登録されていません")
    db.delete(entry)
    db.commit()


# --- 感想 ---

REVIEW_MAX = 2000


def add_review(
    db: Session, user: User, book_id: str, body: str, rating: int | None = None
) -> BookReview:
    """本に感想を投稿する。同じ本に何人でも、何度でも投稿できる。"""
    body = (body or "").strip()
    if not body:
        raise BookError("感想を入力してください")
    if len(body) > REVIEW_MAX:
        raise BookError(f"感想は{REVIEW_MAX}文字までです")
    if rating is not None and not 1 <= rating <= 5:
        raise BookError("評価は1〜5で指定してください")
    if db.query(Book).filter(Book.id == book_id).first() is None:
        raise BookError("本が見つかりません")

    review = BookReview(book_id=book_id, user_id=user.id, body=body, rating=rating)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def update_review(
    db: Session, user: User, review_id: str, body: str, rating: int | None = None
) -> BookReview:
    """自分の感想を書き直す。"""
    review = _own_review(db, user, review_id)
    body = (body or "").strip()
    if not body:
        raise BookError("感想を入力してください")
    if len(body) > REVIEW_MAX:
        raise BookError(f"感想は{REVIEW_MAX}文字までです")
    if rating is not None and not 1 <= rating <= 5:
        raise BookError("評価は1〜5で指定してください")
    review.body = body
    review.rating = rating
    db.commit()
    db.refresh(review)
    return review


def delete_review(db: Session, user: User, review_id: str) -> None:
    db.delete(_own_review(db, user, review_id))
    db.commit()


def _own_review(db: Session, user: User, review_id: str) -> BookReview:
    review = (
        db.query(BookReview)
        .filter(BookReview.id == review_id, BookReview.user_id == user.id)
        .first()
    )
    if review is None:
        raise BookError("感想が見つかりません")
    return review


def reviews_by_book(db: Session) -> dict[str, list[tuple[BookReview, User]]]:
    """本ID -> [(感想, 投稿者)]。新しい順。"""
    rows = (
        db.query(BookReview, User)
        .join(User, User.id == BookReview.user_id)
        .order_by(BookReview.created_at.desc())
        .all()
    )
    grouped: dict[str, list[tuple[BookReview, User]]] = {}
    for review, user in rows:
        grouped.setdefault(review.book_id, []).append((review, user))
    return grouped


def list_books(db: Session) -> list[tuple[Book, list[tuple[User, BookRegistration]]]]:
    """共有本棚。新しく登録された本から順に、登録者つきで返す。"""
    books = db.query(Book).order_by(Book.created_at.desc()).all()
    if not books:
        return []

    rows = (
        db.query(BookRegistration, User)
        .join(User, User.id == BookRegistration.user_id)
        .order_by(BookRegistration.created_at.asc())
        .all()
    )
    by_book: dict[str, list[tuple[User, BookRegistration]]] = {}
    for registration, user in rows:
        by_book.setdefault(registration.book_id, []).append((user, registration))

    return [(book, by_book.get(book.id, [])) for book in books]
