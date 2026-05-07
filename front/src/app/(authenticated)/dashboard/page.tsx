import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import MonthlyChart from "./MonthlyChart";
import TimeProgressCard from "./TimeProgressCard";

type TimeSummary = {
  total_minutes: number;
  month_minutes: number;
  monthly: { year: number; month: number; minutes: number }[];
  recent_logs: { minutes: number; created_at: string }[];
};

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export default async function DashboardPage() {
  const session = await auth();
  const discordId = session!.user.discordId;
  const now = new Date();

  let summary: TimeSummary = {
    total_minutes: 0,
    month_minutes: 0,
    monthly: [],
    recent_logs: [],
  };
  try {
    summary = await apiFetch(`/api/time-logs/summary?discord_id=${discordId}`);
  } catch {
    // バックエンド未起動時はゼロ表示
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        ホーム
      </h1>

      {/* 今月の円グラフ＋累計 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimeProgressCard
          year={now.getFullYear()}
          month={now.getMonth() + 1}
          minutes={summary.month_minutes}
          totalMinutes={summary.total_minutes}
        />

        {/* 月別棒グラフ */}
        <div className="rounded-xl bg-gradient-to-br from-[var(--brand-orange)]/50 via-zinc-300 to-[var(--brand-green)]/50 p-px dark:from-[var(--brand-orange)]/35 dark:via-zinc-700 dark:to-[var(--brand-green)]/35">
          <div className="h-full rounded-[11px] bg-white p-5 dark:bg-zinc-900">
            <p className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              月別作業時間
            </p>
            {summary.monthly.length === 0 ? (
              <p className="text-sm text-zinc-400 leading-relaxed">
                Discordの専用チャンネルに投稿すると記録されます。
                <br />
                例:{" "}
                <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                  2時間勉強した
                </code>
              </p>
            ) : (
              <MonthlyChart
                data={summary.monthly}
                currentYear={now.getFullYear()}
                currentMonth={now.getMonth() + 1}
              />
            )}
          </div>
        </div>
      </div>

      {/* 直近ログ10件 */}
      {summary.recent_logs.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-[var(--brand-green)]/45 via-zinc-300 to-[var(--brand-orange)]/45 p-px dark:from-[var(--brand-green)]/30 dark:via-zinc-700 dark:to-[var(--brand-orange)]/30">
          <div className="rounded-[11px] bg-white p-5 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                直近の記録
              </p>
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Recent
              </span>
            </div>
            <ul className="flex flex-col">
              {summary.recent_logs.map((log, i) => {
                const d = new Date(log.created_at);
                const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
                const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                return (
                  <li
                    key={`${log.created_at}-${i}`}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-zinc-100 py-3 first:border-t-0 dark:border-zinc-800/70"
                  >
                    <span className="font-mono text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-semibold tracking-tight text-black tabular-nums dark:text-zinc-50">
                        {fmt(log.minutes)}
                      </span>
                      <span className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                      {dateStr}
                      <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">
                        ·
                      </span>
                      {timeStr}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            href: "/members",
            label: "メンバー一覧",
            desc: "コミュニティメンバーを確認",
          },
          {
            href: "/activities",
            label: "活動実績",
            desc: "承認済み実績の一覧・申請",
          },
          {
            href: "/profile",
            label: "プロフィール編集",
            desc: "自己紹介・SNSリンクを更新",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl bg-gradient-to-br from-[var(--brand-green)]/40 via-zinc-300 to-[var(--brand-orange)]/40 p-px transition-[background] hover:from-[var(--brand-green)]/70 hover:via-zinc-400 hover:to-[var(--brand-orange)]/70 dark:from-[var(--brand-green)]/30 dark:via-zinc-700 dark:to-[var(--brand-orange)]/30 dark:hover:from-[var(--brand-green)]/55 dark:hover:via-zinc-600 dark:hover:to-[var(--brand-orange)]/55"
          >
            <div className="h-full rounded-[11px] bg-white p-5 dark:bg-zinc-900">
              <p className="font-medium text-black dark:text-zinc-50">
                {item.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
