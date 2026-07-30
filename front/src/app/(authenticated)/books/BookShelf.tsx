"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addReview,
  deleteReview,
  lookupIsbn,
  registerBook,
  unregisterBook,
  updateReview,
} from "@/actions/book";
import { hapticSuccess } from "@/lib/haptics";
import type { Book, BookPreview } from "@/types/book";
import IsbnScanner from "./IsbnScanner";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/** UTC 保存の日時を日本時間の "7/31" 形式にする */
function formatDate(iso: string): string {
  const normalized = /[Z+]/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

/** 表紙。画像が無い・読み込めない場合はタイトルの代替表示にする */
function Cover({
  book,
}: {
  book: { cover_url: string | null; title: string };
}) {
  const [broken, setBroken] = useState(false);
  const show = book.cover_url && !broken;

  return (
    <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
      {show ? (
        /* 外部ドメインの書影なので next/image は使わず素の img で読み込む */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.cover_url ?? ""}
          alt={`${book.title} の表紙`}
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center p-2 text-center text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
          {book.title}
        </span>
      )}
    </span>
  );
}

/** 5段階の星。onChange を渡すと入力用になる */
function Stars({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
}) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="text-xs" style={{ color: "var(--brand-yellow)" }}>
        <span className="sr-only">{`評価 ${value} / 5`}</span>
        <span aria-hidden="true">{"★".repeat(value)}</span>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          {"★".repeat(5 - value)}
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n}点`}
          aria-pressed={value === n}
          className="text-lg leading-none transition-transform hover:scale-110"
          style={{
            color:
              value !== null && n <= value
                ? "var(--brand-yellow)"
                : "color-mix(in srgb, currentColor 25%, transparent)",
          }}
        >
          ★
        </button>
      ))}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-[10px] text-zinc-400 hover:text-zinc-600"
        >
          評価を消す
        </button>
      )}
    </span>
  );
}

export default function BookShelf({ books }: { books: Book[] }) {
  const [items, setItems] = useState(books);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isbn, setIsbn] = useState("");
  const [preview, setPreview] = useState<BookPreview | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [comment, setComment] = useState("");
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(books);
  }, [books]);

  const replaceBook = (book: Book) =>
    setItems((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      return exists
        ? prev.map((b) => (b.id === book.id ? book : b))
        : [book, ...prev];
    });

  /** ISBN を照会して、登録前のプレビューを出す */
  const doLookup = (value: string) => {
    const target = value.trim();
    if (!target) return;
    setIsbn(target);
    startTransition(async () => {
      const res = await lookupIsbn(target);
      if (res.preview) {
        setPreview(res.preview);
        setManualTitle("");
        setMessage(null);
        hapticSuccess();
      } else {
        setPreview(null);
        // 見つからなくてもタイトル手入力で登録できるようにする
        setManualTitle("");
        setMessage({ ok: false, text: res.message });
      }
    });
  };

  const doRegister = () => {
    startTransition(async () => {
      const res = await registerBook(isbn, comment, manualTitle);
      if (res.book) {
        replaceBook(res.book);
        setPreview(null);
        setIsbn("");
        setComment("");
        setManualTitle("");
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const doUnregister = (book: Book) => {
    if (!window.confirm(`「${book.title}」を自分の本棚から外しますか？`))
      return;
    startTransition(async () => {
      const res = await unregisterBook(book.id);
      if (res.ok) {
        setItems((prev) =>
          prev.map((b) =>
            b.id === book.id
              ? { ...b, registered_by_me: false, readers: [] }
              : b,
          ),
        );
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* --- 登録 --- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          本を登録する
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          カメラでバーコードを読み取るか、ISBN を直接入力してください。
          登録した本は団体全体の本棚に並びます。
        </p>

        <IsbnScanner onDetected={doLookup} paused={isPending || !!preview} />

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doLookup(isbn);
            }}
            placeholder="ISBN（例: 978-4-87311-565-8）"
            className={`${inputClass} sm:max-w-xs`}
          />
          <button
            type="button"
            onClick={() => doLookup(isbn)}
            disabled={isPending || !isbn.trim()}
            className="shrink-0 rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            {isPending ? "検索中..." : "検索"}
          </button>
        </div>

        {/* 見つからなかったときは手入力で登録できる */}
        {message && !message.ok && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs" style={{ color: "var(--brand-orange)" }}>
              {message.text}
            </p>
            {isbn.trim() && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="タイトルを入力して登録"
                  className={`${inputClass} sm:max-w-xs`}
                />
                <button
                  type="button"
                  onClick={doRegister}
                  disabled={isPending || !manualTitle.trim()}
                  className="shrink-0 rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-green)" }}
                >
                  この内容で登録
                </button>
              </div>
            )}
          </div>
        )}

        {/* 照会できたらプレビューを出して確認してから登録 */}
        {preview && (
          <div className="mt-4 flex gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="w-20 shrink-0 sm:w-24">
              <Cover book={preview} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {preview.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {[preview.authors, preview.publisher, preview.published_date]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                  ISBN {preview.isbn13}
                  {preview.source && ` · ${preview.source}`}
                  {preview.already_on_shelf && " · すでに本棚にあります"}
                </p>
              </div>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="ひとこと（任意）"
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={doRegister}
                  disabled={isPending || preview.registered_by_me}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-green)" }}
                >
                  {preview.registered_by_me
                    ? "登録済み"
                    : isPending
                      ? "登録中..."
                      : "本棚に追加"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setComment("");
                  }}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  やめる
                </button>
              </div>
            </div>
          </div>
        )}

        {message?.ok && (
          <p
            className="mt-3 text-sm font-medium"
            style={{ color: "var(--brand-green)" }}
          >
            📚 {message.text}
          </p>
        )}
      </section>

      {/* --- 本棚 --- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            みんなの本棚
          </h2>
          <span className="font-mono tabular-nums text-zinc-400">
            <span className="text-2xl font-semibold">{items.length}</span>
            <span className="text-sm"> 冊</span>
          </span>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
            まだ1冊もありません。読んだ本を登録してみましょう 📚
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((book) => (
              <li key={book.id}>
                <button
                  type="button"
                  onClick={() => setOpenBookId(book.id)}
                  className="group flex w-full flex-col gap-2 rounded-xl border border-zinc-200 p-2.5 text-left transition-shadow hover:shadow-md dark:border-zinc-800"
                  style={{
                    borderColor: book.registered_by_me
                      ? "var(--brand-green)"
                      : undefined,
                  }}
                >
                  <Cover book={book} />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-xs font-medium text-zinc-800 dark:text-zinc-100">
                      {book.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                      <span>👥 {book.readers.length}</span>
                      <span>💬 {book.reviews.length}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- 詳細と感想 --- */}
      {openBookId && (
        <BookDetail
          book={items.find((b) => b.id === openBookId) as Book}
          onClose={() => setOpenBookId(null)}
          onUpdated={replaceBook}
          onUnregister={doUnregister}
          onMessage={setMessage}
        />
      )}
    </div>
  );
}

/** 本の詳細と、みんなの感想 */
function BookDetail({
  book,
  onClose,
  onUpdated,
  onUnregister,
  onMessage,
}: {
  book: Book | undefined;
  onClose: () => void;
  onUpdated: (book: Book) => void;
  onUnregister: (book: Book) => void;
  onMessage: (m: { ok: boolean; text: string }) => void;
}) {
  const [body, setBody] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Esc で閉じられるようにし、背後はスクロールさせない
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  if (!book) return null;

  const post = () => {
    startTransition(async () => {
      const res = await addReview(book.id, body, rating);
      if (res.book) {
        onUpdated(res.book);
        setBody("");
        setRating(null);
        hapticSuccess();
      }
      onMessage({ ok: res.ok, text: res.message });
    });
  };

  const saveEdit = (reviewId: string) => {
    startTransition(async () => {
      const res = await updateReview(book.id, reviewId, editBody, editRating);
      if (res.book) {
        onUpdated(res.book);
        setEditingId(null);
      }
      onMessage({ ok: res.ok, text: res.message });
    });
  };

  const removeReview = (reviewId: string) => {
    if (!window.confirm("この感想を削除しますか？")) return;
    startTransition(async () => {
      const res = await deleteReview(book.id, reviewId);
      if (res.book) onUpdated(res.book);
      onMessage({ ok: res.ok, text: res.message });
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-xl sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-4">
            <span className="w-20 shrink-0 sm:w-24">
              <Cover book={book} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-black dark:text-zinc-50">
                {book.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {[book.authors, book.publisher, book.published_date]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">
                ISBN {book.isbn13}
              </p>
              {book.readers.length > 0 && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  本棚に置いた人: {book.readers.map((r) => r.name).join("、")}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {book.description && (
          <p className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            {book.description}
          </p>
        )}

        {book.registered_by_me && (
          <button
            type="button"
            onClick={() => onUnregister(book)}
            className="mt-3 self-start text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
          >
            自分の本棚から外す
          </button>
        )}

        {/* --- 感想を書く --- */}
        <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            この本の感想を書く
          </h4>
          <p className="mt-0.5 mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            同じ本にみんなで書けます。何度でも投稿できます。
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="読んで感じたこと・活かせそうなこと"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Stars value={rating} onChange={setRating} />
            <button
              type="button"
              onClick={post}
              disabled={isPending || !body.trim()}
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              {isPending ? "投稿中..." : "感想を投稿"}
            </button>
          </div>
        </div>

        {/* --- みんなの感想 --- */}
        <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            みんなの感想（{book.reviews.length}件）
          </h4>
          {book.reviews.length === 0 ? (
            <p className="text-xs text-zinc-400">
              まだありません。最初の感想を書いてみましょう。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {book.reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    {review.avatar_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={review.avatar_url}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {review.name}
                    </span>
                    <Stars value={review.rating} />
                    <span className="ml-auto font-mono text-[10px] text-zinc-400">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  {editingId === review.id ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        className={inputClass}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars value={editRating} onChange={setEditRating} />
                        <button
                          type="button"
                          onClick={() => saveEdit(review.id)}
                          disabled={isPending || !editBody.trim()}
                          className="rounded-full px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                          style={{ backgroundColor: "var(--brand-green)" }}
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs dark:border-zinc-700"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                        {review.body}
                      </p>
                      {review.mine && (
                        <div className="mt-1.5 flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(review.id);
                              setEditBody(review.body);
                              setEditRating(review.rating);
                            }}
                            className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => removeReview(review.id)}
                            className="text-[11px] text-zinc-400 hover:text-[var(--brand-orange)]"
                          >
                            削除
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
