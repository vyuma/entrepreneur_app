import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import {
  ENTRY_STATUS_LABELS,
  type Entry,
  type EntryStatus,
} from "@/types/competition";
import EntryCard from "./EntryCard";

const COLUMNS: { status: EntryStatus; color: string; hint: string }[] = [
  {
    status: "challenge",
    color: "var(--brand-blue)",
    hint: "応募を出したもの",
  },
  {
    status: "wait",
    color: "var(--brand-yellow)",
    hint: "結果を待っているもの",
  },
  {
    status: "achieve",
    color: "var(--brand-green)",
    hint: "成果が出たもの（活動実績が自動申請されます）",
  },
];

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope = "mine" } = await searchParams;
  const mine = scope !== "all";

  const session = await auth();
  const discordId = session!.user.discordId;

  let entries: Entry[] = [];
  let error: string | null = null;
  try {
    entries = await apiFetch(
      `/api/competitions/entries?discord_id=${discordId}&mine=${mine}`,
    );
  } catch {
    error = "応募情報を取得できませんでした。";
  }

  // 自分のエントリだけ編集可（サークル内公開でも編集は本人のみ）
  const myEntries = entries.filter((e) => mine || e.username !== null);
  const byStatus = (status: EntryStatus) =>
    myEntries.filter((e) => e.status === status);
  const dropped = byStatus("dropped");

  const tabClass = (active: boolean) =>
    active
      ? "rounded-full px-4 py-1.5 text-sm font-medium text-white"
      : "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          成果トラッキング
        </h1>
        <Link
          href="/competitions"
          className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          コンペを探す
        </Link>
      </div>

      <div className="flex gap-2">
        <Link
          href="/achievements?scope=mine"
          className={tabClass(mine)}
          style={mine ? { backgroundColor: "var(--brand-blue)" } : undefined}
        >
          自分の応募
        </Link>
        <Link
          href="/achievements?scope=all"
          className={tabClass(!mine)}
          style={!mine ? { backgroundColor: "var(--brand-blue)" } : undefined}
        >
          サークル全体
        </Link>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = byStatus(col.status);
          return (
            <section
              key={col.status}
              className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <header className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
                  {ENTRY_STATUS_LABELS[col.status]}
                </h2>
                <span className="ml-auto font-mono text-xs text-zinc-400">
                  {items.length}
                </span>
              </header>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {col.hint}
              </p>

              {items.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-400">
                  まだありません
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((e) => (
                    <EntryCard key={e.id} entry={e} editable={mine} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {dropped.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
            見送り（{dropped.length}件）
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dropped.map((e) => (
              <EntryCard key={e.id} entry={e} editable={mine} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
