"""共有本棚の API。

ISBN の照会は外部APIをここで叩く（フロントから直接叩かない）。
本棚は団体全体で共有し、誰が登録したかも一緒に返す。
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import verify_token
from app.core.database import get_db
from app.services import books as service
from app.services.competition_entry import user_or_404

router = APIRouter()


class BookPreview(BaseModel):
    """登録前に見せる書誌情報。"""

    isbn13: str
    title: str
    authors: str | None = None
    publisher: str | None = None
    published_date: str | None = None
    cover_url: str | None = None
    description: str | None = None
    # どの外部サービスから取れたか
    source: str | None = None
    # すでに本棚にある本か
    already_on_shelf: bool = False
    # 自分が登録済みか
    registered_by_me: bool = False


class Reader(BaseModel):
    """その本を登録した人。"""

    user_id: str
    name: str
    avatar_url: str | None = None
    comment: str | None = None
    created_at: datetime


class ReviewOut(BaseModel):
    id: str
    user_id: str
    name: str
    avatar_url: str | None = None
    body: str
    rating: int | None = None
    created_at: datetime
    # 自分が書いた感想か（編集・削除ボタンの出し分け用）
    mine: bool = False


class BookOut(BaseModel):
    id: str
    isbn13: str
    title: str
    authors: str | None
    publisher: str | None
    published_date: str | None
    cover_url: str | None
    description: str | None
    created_at: datetime
    readers: list[Reader]
    # みんなの感想（新しい順）
    reviews: list[ReviewOut] = []
    # 自分が登録済みか
    registered_by_me: bool = False


class RegisterBody(BaseModel):
    isbn: str = Field(min_length=8, max_length=20)
    comment: str | None = Field(default=None, max_length=500)
    # 外部APIで見つからなかったときの手入力タイトル
    title: str | None = Field(default=None, max_length=300)


class RegisterResult(BaseModel):
    newly_registered: bool
    book: BookOut


class ReviewBody(BaseModel):
    body: str = Field(min_length=1, max_length=service.REVIEW_MAX)
    rating: int | None = Field(default=None, ge=1, le=5)


def _bad_request(exc: service.BookError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _book_out(book, readers, me_id: str | None, reviews=None) -> BookOut:
    return BookOut(
        id=book.id,
        isbn13=book.isbn13,
        title=book.title,
        authors=book.authors,
        publisher=book.publisher,
        published_date=book.published_date,
        cover_url=book.cover_url,
        description=book.description,
        created_at=book.created_at,
        readers=[
            Reader(
                user_id=user.id,
                name=user.display_name or user.username,
                avatar_url=user.avatar_url,
                comment=registration.comment,
                created_at=registration.created_at,
            )
            for user, registration in readers
        ],
        reviews=[
            ReviewOut(
                id=review.id,
                user_id=user.id,
                name=user.display_name or user.username,
                avatar_url=user.avatar_url,
                body=review.body,
                rating=review.rating,
                created_at=review.created_at,
                mine=user.id == me_id,
            )
            for review, user in (reviews or [])
        ],
        registered_by_me=any(user.id == me_id for user, _ in readers),
    )


@router.get("", response_model=list[BookOut])
def list_books(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    """団体全体の共有本棚。"""
    user = user_or_404(db, discord_id)
    reviews = service.reviews_by_book(db)
    return [
        _book_out(book, readers, user.id, reviews.get(book.id, []))
        for book, readers in service.list_books(db)
    ]


@router.get("/lookup", response_model=BookPreview)
def lookup_isbn(
    isbn: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """ISBN から書誌情報を引く（登録はしない）。"""
    user = user_or_404(db, discord_id)
    try:
        data = service.lookup(isbn)
    except service.BookError as exc:
        raise _bad_request(exc) from exc

    preview = BookPreview(**data)

    # すでに本棚にあるかどうかも返して、二重登録を画面側で防げるようにする
    from app.models.book import Book, BookRegistration

    book = db.query(Book).filter(Book.isbn13 == preview.isbn13).first()
    if book is not None:
        preview.already_on_shelf = True
        preview.registered_by_me = (
            db.query(BookRegistration)
            .filter(
                BookRegistration.book_id == book.id,
                BookRegistration.user_id == user.id,
            )
            .first()
            is not None
        )
    return preview


@router.post("", response_model=RegisterResult, status_code=status.HTTP_201_CREATED)
def register_book(
    body: RegisterBody,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """ISBN で本棚に登録する。同じ本が既にあれば登録者として加わる。"""
    user = user_or_404(db, discord_id)
    try:
        book, newly = service.register(db, user, body.isbn, body.comment, body.title)
    except service.BookError as exc:
        raise _bad_request(exc) from exc

    readers = next((r for b, r in service.list_books(db) if b.id == book.id), [])
    reviews = service.reviews_by_book(db).get(book.id, [])
    return RegisterResult(
        newly_registered=newly, book=_book_out(book, readers, user.id, reviews)
    )


@router.delete("/{book_id}/registration", status_code=status.HTTP_204_NO_CONTENT)
def unregister_book(
    book_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """自分の登録だけ外す。"""
    user = user_or_404(db, discord_id)
    try:
        service.unregister(db, user, book_id)
    except service.BookError as exc:
        raise _bad_request(exc) from exc


# --- 感想 ---


def _book_response(db: Session, book_id: str, me_id: str) -> BookOut:
    """更新後の本を、登録者と感想つきで返す。"""
    entry = next((x for x in service.list_books(db) if x[0].id == book_id), None)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="本が見つかりません"
        )
    book, readers = entry
    reviews = service.reviews_by_book(db).get(book_id, [])
    return _book_out(book, readers, me_id, reviews)


@router.post("/{book_id}/reviews", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def add_review(
    book_id: str,
    body: ReviewBody,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """本に感想を投稿する。同じ本にみんなで投稿できる。"""
    user = user_or_404(db, discord_id)
    try:
        service.add_review(db, user, book_id, body.body, body.rating)
    except service.BookError as exc:
        raise _bad_request(exc) from exc
    return _book_response(db, book_id, user.id)


@router.patch("/{book_id}/reviews/{review_id}", response_model=BookOut)
def update_review(
    book_id: str,
    review_id: str,
    body: ReviewBody,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """自分の感想を書き直す。"""
    user = user_or_404(db, discord_id)
    try:
        service.update_review(db, user, review_id, body.body, body.rating)
    except service.BookError as exc:
        raise _bad_request(exc) from exc
    return _book_response(db, book_id, user.id)


@router.delete("/{book_id}/reviews/{review_id}", response_model=BookOut)
def delete_review(
    book_id: str,
    review_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """自分の感想を削除する。"""
    user = user_or_404(db, discord_id)
    try:
        service.delete_review(db, user, review_id)
    except service.BookError as exc:
        raise _bad_request(exc) from exc
    return _book_response(db, book_id, user.id)
