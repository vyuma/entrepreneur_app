import Image from "next/image";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Member = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  total_points: number;
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort = "created_at" } = await searchParams;
  let members: Member[] = [];
  try {
    members = await apiFetch(`/api/members?sort=${sort}`);
  } catch {
    // バックエンド未起動時は空リスト
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          メンバー一覧
        </h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/members?sort=created_at"
            className={`px-3 py-1 rounded-full border transition-colors ${sort === "created_at" ? "bg-black text-white dark:bg-white dark:text-black" : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            参加日順
          </Link>
          <Link
            href="/members?sort=points"
            className={`px-3 py-1 rounded-full border transition-colors ${sort === "points" ? "bg-black text-white dark:bg-white dark:text-black" : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            ポイント順
          </Link>
        </div>
      </div>

      {members.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400">
          メンバーはまだいません。
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              {m.avatar_url ? (
                <Image
                  src={m.avatar_url}
                  alt={m.username}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              )}
              <div>
                <p className="font-medium text-black dark:text-zinc-50">
                  {m.display_name || m.username}
                </p>
                <p className="text-sm text-zinc-500">@{m.username}</p>
              </div>
            </div>
            {m.bio && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {m.bio}
              </p>
            )}
            <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                参加: {new Date(m.created_at).toLocaleDateString("ja-JP")}
              </span>
              <span className="font-medium text-black dark:text-zinc-50">
                {m.total_points} pt
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
