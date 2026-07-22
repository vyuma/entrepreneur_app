import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import {
  ENTRY_STATUS_LABELS,
  type Entry,
  type EntryStatus,
  GRACE_DAYS,
} from "@/types/competition";
import EntryCard from "./EntryCard";
import ReportAchievementForm from "./ReportAchievementForm";

const COLUMNS: { status: EntryStatus; color: string; hint: string }[] = [
  {
    status: "challenge",
    color: "var(--brand-blue)",
    hint: "応募を出した段階。締切が近いものはバッジで分かります",
  },
  {
    status: "wait",
    color: "var(--brand-yellow)",
    hint: "提出を終えて結果発表を待っている段階",
  },
  {
    status: "achieve",
    color: "var(--brand-green)",
    hint: "受賞・採択されたもの。ここに入ると実績として残ります",
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

      {/* このボードの使い方 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          このボードについて
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          応募したコンペを
          <span style={{ color: "var(--brand-blue)" }}> 応募 </span>→
          <span style={{ color: "var(--brand-yellow)" }}> 結果待ち </span>→
          <span style={{ color: "var(--brand-green)" }}> 成果 </span>
          と動かして管理します。コンペ一覧の「応募に追加」から登録すると、締切が自動で入ります。
        </p>

        <ul className="mt-3 flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span style={{ color: "var(--brand-green)" }}>●</span>
            <span>
              <strong className="font-medium">
                成果に入れると実績になります。
              </strong>
              ポートフォリオと受賞数に反映され、活動実績として自動申請されます（承認でポイント付与）。
            </span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: "var(--brand-orange)" }}>●</span>
            <span>
              <strong className="font-medium">
                成果にならなかったものは自動で消えます。
              </strong>
              「見送り」を選ぶとすぐに削除され、応募・結果待ちのまま期日から
              {GRACE_DAYS}
              日過ぎたものも自動削除されます。受賞した場合は必ず「成果」に移してください。
            </span>
          </li>
          <li className="flex gap-2">
            <span style={{ color: "var(--brand-blue)" }}>●</span>
            <span>
              カードはサークル全体に公開されますが、
              <strong className="font-medium">
                メモは本人だけが見られます。
              </strong>
              編集できるのも本人のみです。
            </span>
          </li>
        </ul>
      </section>

      {mine && <ReportAchievementForm />}

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
    </div>
  );
}
