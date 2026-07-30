import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Book } from "@/types/book";
import BookShelf from "./BookShelf";

export const metadata = { title: "本棚 | NueStar" };

export default async function BooksPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let books: Book[] = [];
  let error: string | null = null;
  try {
    books = await apiFetch(`/api/books?discord_id=${discordId}`);
  } catch {
    error = "本棚を取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Bookshelf
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-black dark:text-zinc-50">
          本棚
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          本のバーコードをカメラで読み取ると、表紙つきで登録できます。
          本棚と感想は団体のみんなに共有されます。
        </p>
      </div>

      {error && (
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--brand-orange)",
            color: "var(--brand-orange)",
          }}
        >
          {error}
        </p>
      )}

      <BookShelf books={books} />
    </div>
  );
}
