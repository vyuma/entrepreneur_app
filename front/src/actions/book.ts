"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Book, BookPreview } from "@/types/book";

/** 操作者は必ずセッション由来の discord_id を使う（なりすまし防止） */
async function actorId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

function detailOf(err: unknown): string {
  const raw = err instanceof Error ? err.message : "不明なエラー";
  return raw.match(/"detail":"([^"]+)"/)?.[1] ?? raw;
}

export type LookupState = {
  ok: boolean;
  message: string;
  preview?: BookPreview;
};

/** ISBN から書誌情報を引く（登録はしない） */
export async function lookupIsbn(isbn: string): Promise<LookupState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const preview: BookPreview = await apiFetch(
      `/api/books/lookup?isbn=${encodeURIComponent(isbn)}&discord_id=${discordId}`,
    );
    return { ok: true, message: "", preview };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

export type BookState = {
  ok: boolean;
  message: string;
  book?: Book;
};

async function run(
  fn: (discordId: string) => Promise<Book | null>,
  successMessage: string,
): Promise<BookState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const book = await fn(discordId);
    revalidatePath("/books");
    return { ok: true, message: successMessage, book: book ?? undefined };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

/** ISBN で本棚に登録する */
export async function registerBook(
  isbn: string,
  comment: string,
  fallbackTitle?: string,
): Promise<BookState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const result: { newly_registered: boolean; book: Book } = await apiFetch(
      `/api/books?discord_id=${discordId}`,
      {
        method: "POST",
        body: JSON.stringify({
          isbn,
          comment: comment.trim() || null,
          title: fallbackTitle?.trim() || null,
        }),
      },
    );
    revalidatePath("/books");
    return {
      ok: true,
      book: result.book,
      message: result.newly_registered
        ? `「${result.book.title}」を本棚に追加しました`
        : "この本はすでに登録済みです",
    };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

/** 自分の登録だけ外す（本と他の人の登録は残る） */
export async function unregisterBook(bookId: string): Promise<BookState> {
  return run(
    (discordId) =>
      apiFetch(`/api/books/${bookId}/registration?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "本棚から外しました",
  );
}

/** 感想を投稿する */
export async function addReview(
  bookId: string,
  body: string,
  rating: number | null,
): Promise<BookState> {
  if (!body.trim()) return { ok: false, message: "感想を入力してください" };
  return run(
    (discordId) =>
      apiFetch(`/api/books/${bookId}/reviews?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({ body, rating }),
      }),
    "感想を投稿しました",
  );
}

/** 自分の感想を書き直す */
export async function updateReview(
  bookId: string,
  reviewId: string,
  body: string,
  rating: number | null,
): Promise<BookState> {
  if (!body.trim()) return { ok: false, message: "感想を入力してください" };
  return run(
    (discordId) =>
      apiFetch(
        `/api/books/${bookId}/reviews/${reviewId}?discord_id=${discordId}`,
        { method: "PATCH", body: JSON.stringify({ body, rating }) },
      ),
    "感想を更新しました",
  );
}

/** 自分の感想を削除する */
export async function deleteReview(
  bookId: string,
  reviewId: string,
): Promise<BookState> {
  return run(
    (discordId) =>
      apiFetch(
        `/api/books/${bookId}/reviews/${reviewId}?discord_id=${discordId}`,
        { method: "DELETE" },
      ),
    "感想を削除しました",
  );
}
