import type { DashboardSummary } from "@/types/competition";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 分数から緑の濃さ（0〜1）を決める。3時間で最大。 */
function intensity(minutes: number) {
  if (minutes <= 0) return 0;
  return Math.min(1, 0.25 + (minutes / 180) * 0.75);
}

export default function WeekCalendar({
  week,
}: {
  week: DashboardSummary["week"];
}) {
  const total = week.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className="rounded-xl bg-gradient-to-r from-[var(--brand-green)]/45 via-zinc-300 to-[var(--brand-green)]/20 p-px dark:from-[var(--brand-green)]/30 dark:via-zinc-700 dark:to-[var(--brand-green)]/15">
      <div className="rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            今週のアクティビティ
          </p>
          <span className="font-mono text-[11px] tabular-nums text-zinc-400">
            計 {Math.floor(total / 60)}時間{total % 60}分
          </span>
        </div>

        <div className="flex gap-2">
          {week.map((day) => {
            const d = new Date(`${day.date}T00:00:00`);
            const alpha = intensity(day.minutes);
            return (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] text-zinc-400">
                  {WEEKDAYS[d.getDay()]}
                </span>
                <div
                  title={`${day.date}: ${day.minutes}分`}
                  className="h-10 w-full rounded-md border border-zinc-100 dark:border-zinc-800"
                  style={{
                    backgroundColor:
                      alpha > 0
                        ? `color-mix(in srgb, var(--brand-green) ${Math.round(alpha * 100)}%, transparent)`
                        : undefined,
                  }}
                />
                <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
