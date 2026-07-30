"use client";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type Day = {
  key: string;
  weekday: number;
  dayOfMonth: number;
  stamped: boolean;
  isToday: boolean;
  isFuture: boolean;
};

/** 今週（日曜始まり）の7日分を作る。判定は日本時間の日付文字列で行う */
function thisWeek(stampedDates: Set<string>): Day[] {
  const now = new Date();
  const todayKey = jstKey(now);
  // 日本時間での曜日に合わせて週初め（日曜）まで戻る
  const jstNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
  );
  const sunday = new Date(jstNow);
  sunday.setDate(sunday.getDate() - jstNow.getDay());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      key,
      weekday: i,
      dayOfMonth: d.getDate(),
      stamped: stampedDates.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
}

/** Date を日本時間の "YYYY-MM-DD" にする */
function jstKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

/**
 * 一週間のスタンプカード。
 * チェックインした日は朝日のスタンプが押され、まだの日は点線の枠が空いている。
 * 「空いている枠を埋めたい」という気持ちを作るのが目的なので、
 * 未来の日も薄く見せて一週間ぶんの枠を常に出しておく。
 */
export default function StampCard({
  recentDates,
  stampedToday,
}: {
  recentDates: string[];
  stampedToday: boolean;
}) {
  const stamped = new Set(recentDates.map((d) => d.slice(0, 10)));
  const days = thisWeek(stamped);
  const count = days.filter((d) => d.stamped).length;
  const perfect = count === 7;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: perfect
          ? "var(--brand-orange)"
          : "color-mix(in srgb, currentColor 12%, transparent)",
        backgroundColor: perfect
          ? "color-mix(in srgb, var(--brand-orange) 6%, transparent)"
          : undefined,
      }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Weekly Stamp Card
        </p>
        <p className="font-mono tabular-nums text-zinc-400">
          <span
            className="text-lg font-semibold"
            style={{ color: count > 0 ? "var(--brand-orange)" : undefined }}
          >
            {count}
          </span>
          <span className="text-[11px]"> / 7 個</span>
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => (
          <div key={day.key} className="flex flex-col items-center gap-1.5">
            <span
              className={`text-[10px] font-medium ${
                day.weekday === 0
                  ? "text-red-400"
                  : day.weekday === 6
                    ? "text-blue-400"
                    : "text-zinc-400"
              }`}
            >
              {WEEKDAY_LABELS[day.weekday]}
            </span>

            <div
              title={`${day.key}${day.stamped ? "（スタンプ済み）" : ""}`}
              className="relative grid aspect-square w-full place-items-center rounded-lg transition-all duration-300"
              style={{
                border: day.stamped
                  ? "1.5px solid var(--brand-orange)"
                  : `1.5px dashed ${
                      day.isToday
                        ? "var(--brand-orange)"
                        : "color-mix(in srgb, currentColor 18%, transparent)"
                    }`,
                backgroundColor: day.stamped
                  ? "color-mix(in srgb, var(--brand-orange) 12%, transparent)"
                  : undefined,
                opacity: day.isFuture ? 0.45 : 1,
              }}
            >
              {day.stamped ? (
                // 押されたスタンプ。少し傾けて「判子」らしくする
                <span
                  className={`text-lg sm:text-xl ${
                    day.isToday && stampedToday ? "check-pop" : ""
                  }`}
                  style={{ transform: "rotate(-8deg)" }}
                >
                  🌅
                </span>
              ) : (
                <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                  {day.dayOfMonth}
                </span>
              )}

              {/* 今日の枠だけ位置が分かるよう下に印を出す */}
              {day.isToday && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: "var(--brand-orange)" }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {perfect
          ? "🏆 今週は全部そろいました。完璧です！"
          : stampedToday
            ? `今週は ${count} 個。この調子で空いた枠を埋めていきましょう`
            : "チェックインすると今日の枠にスタンプが押されます"}
      </p>
    </div>
  );
}
