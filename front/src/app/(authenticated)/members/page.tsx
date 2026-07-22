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
  total_hours: number;
  skills: string[];
  achievement_count: number;
};

const SORTS = [
  { value: "created_at", label: "参加日順" },
  { value: "points", label: "ポイント順" },
  { value: "hours", label: "作業時間順" },
  { value: "achievements", label: "受賞数順" },
  { value: "name", label: "名前順" },
] as const;

/** ランキング上位のアクセント色 */
const RANK_COLOR = [
  "var(--brand-yellow)",
  "#a1a1aa",
  "var(--brand-orange)",
] as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; skill?: string }>;
}) {
  const { sort = "created_at", skill } = await searchParams;

  let members: Member[] = [];
  let allSkills: string[] = [];
  try {
    [members, allSkills] = await Promise.all([
      apiFetch(`/api/members?sort=${sort}`),
      apiFetch("/api/members/skills"),
    ]);
  } catch {
    // バックエンド未起動時は空リスト
  }

  const filtered = skill
    ? members.filter((m) => m.skills.includes(skill))
    : members;

  // ランキングは常にポイント順の上位5名
  const ranking = [...members]
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 5);

  const chipClass = (active: boolean) =>
    active
      ? "rounded-full px-3 py-1 text-sm font-medium text-white"
      : "rounded-full border border-zinc-300 px-3 py-1 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        メンバー
      </h1>

      {/* ランキング */}
      {ranking.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            ポイントランキング
          </h2>
          <ol className="flex flex-col">
            {ranking.map((m, i) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800/70"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white tabular-nums"
                  style={{
                    backgroundColor: RANK_COLOR[i] ?? "var(--brand-blue)",
                  }}
                >
                  {i + 1}
                </span>
                <Link
                  href={`/portfolio/${m.id}`}
                  className="min-w-0 flex-1 truncate text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  {m.display_name || m.username}
                </Link>
                <span className="shrink-0 font-mono text-sm tabular-nums text-black dark:text-zinc-50">
                  {m.total_points} pt
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* タレントソート */}
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={`/members?sort=${s.value}${skill ? `&skill=${encodeURIComponent(skill)}` : ""}`}
            className={chipClass(sort === s.value)}
            style={
              sort === s.value
                ? { backgroundColor: "var(--brand-green)" }
                : undefined
            }
          >
            {s.label}
          </Link>
        ))}
      </div>

      {allSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
            スキル
          </span>
          <Link
            href={`/members?sort=${sort}`}
            className={chipClass(!skill)}
            style={
              !skill ? { backgroundColor: "var(--brand-blue)" } : undefined
            }
          >
            すべて
          </Link>
          {allSkills.map((s) => (
            <Link
              key={s}
              href={`/members?sort=${sort}&skill=${encodeURIComponent(s)}`}
              className={chipClass(skill === s)}
              style={
                skill === s
                  ? { backgroundColor: "var(--brand-blue)" }
                  : undefined
              }
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400">
          該当するメンバーはいません。
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
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
              <div className="min-w-0">
                <Link
                  href={`/portfolio/${m.id}`}
                  className="block truncate font-medium text-black hover:underline dark:text-zinc-50"
                >
                  {m.display_name || m.username}
                </Link>
                <p className="truncate text-sm text-zinc-500">@{m.username}</p>
              </div>
            </div>

            {m.bio && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                {m.bio}
              </p>
            )}

            {m.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {m.skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: "var(--brand-blue)",
                      color: "var(--brand-blue)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between pt-1 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex gap-3 text-xs">
                <span>{m.total_hours}h</span>
                {m.achievement_count > 0 && (
                  <span style={{ color: "var(--brand-green)" }}>
                    🏆 {m.achievement_count}
                  </span>
                )}
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
