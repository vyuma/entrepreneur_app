import Link from "next/link";
import type { DashboardSummary } from "@/types/competition";

export default function UpcomingDeadlines({
  upcoming,
}: {
  upcoming: DashboardSummary["upcoming"];
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[var(--brand-orange)]/45 via-zinc-300 to-[var(--brand-yellow)]/45 p-px dark:from-[var(--brand-orange)]/30 dark:via-zinc-700 dark:to-[var(--brand-yellow)]/30">
      <div className="h-full rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            直近の締切
          </p>
          <Link
            href="/competitions"
            className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
          >
            コンペを探す →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm leading-relaxed text-zinc-400">
            締切を控えた応募はありません。
            <br />
            コンペ一覧から応募を登録すると、ここに残り日数が表示されます。
          </p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.map((u) => {
              const urgent = u.days_left <= 7;
              return (
                <li
                  key={u.entry_id}
                  className="flex items-center justify-between gap-3 border-t border-zinc-100 py-3 first:border-t-0 dark:border-zinc-800/70"
                >
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                  >
                    {u.name}
                  </a>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-white tabular-nums"
                    style={{
                      backgroundColor: urgent
                        ? "var(--brand-orange)"
                        : "var(--brand-green)",
                    }}
                  >
                    {u.days_left === 0 ? "本日" : `残り${u.days_left}日`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
