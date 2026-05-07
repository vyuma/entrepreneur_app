"use client";

import { useEffect, useState } from "react";
import { POINTS_LADDER, resolveTier } from "@/lib/tiers";

type Props = {
  totalPoints: number;
  activityPoints: number;
  timePoints: number;
  totalMinutes: number;
  daysSinceJoined: number;
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export default function PointsHero({
  totalPoints,
  activityPoints,
  timePoints,
  totalMinutes,
  daysSinceJoined,
}: Props) {
  const tier = resolveTier(totalPoints, POINTS_LADDER);
  const displayed = useCountUp(totalPoints);

  return (
    <div
      className={`rounded-xl ${tier.wrapper} p-px transition-all duration-500`}
    >
      <div className="relative overflow-hidden rounded-[11px] bg-white p-6 dark:bg-zinc-900">
        {/* 背後の拍動グロウ (tier 連動) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 top-1/2 -z-0 block h-44 w-44 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${tier.glow[0]} 0%, transparent 70%)`,
            animation: "points-glow 4s ease-in-out infinite",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-4 top-1/2 -z-0 block h-32 w-32 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${tier.glow[1]} 0%, transparent 70%)`,
            animation: "points-glow 4s ease-in-out 1.2s infinite",
          }}
        />

        <div className="relative flex items-center gap-6">
          {/* バッジ: 回転コニック × 2 + カウントアップ */}
          <div
            className={`relative flex h-24 w-24 shrink-0 items-center justify-center ${tier.badgeExtraClass ?? ""}`}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{
                background: tier.ring,
                animation: `ring-spin ${tier.spinSec}s linear infinite`,
              }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-1 rounded-full opacity-40 blur-[3px]"
              style={{
                background: tier.ringInner,
                animation: `ring-spin ${tier.spinSec * 1.6}s linear infinite reverse`,
              }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-[3px] rounded-full bg-white dark:bg-zinc-900"
            />
            <span
              className={`relative font-mono text-2xl font-bold tabular-nums ${tier.numberClass}`}
              style={tier.numberStyle}
            >
              {displayed}
            </span>
          </div>

          {/* テキストエリア */}
          <div className="flex flex-col gap-1">
            <p
              className="text-lg font-semibold text-black opacity-0 dark:text-zinc-50"
              style={{ animation: "fade-up 0.5s ease-out 0.05s forwards" }}
            >
              累計アントレポイント
            </p>
            <p
              key={tier.name}
              className={`mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${tier.labelClass} opacity-0`}
              style={{ animation: "fade-up 0.4s ease-out 0.15s forwards" }}
            >
              ▸ {tier.label} TIER
            </p>
            <div className="flex flex-col gap-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span
                className="opacity-0"
                style={{ animation: "fade-up 0.5s ease-out 0.25s forwards" }}
              >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-green)] align-middle shadow-[0_0_6px_var(--brand-green)]" />
                作業ポイント:{" "}
                <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                  {timePoints}
                </span>{" "}
                pt（{formatMinutes(totalMinutes)} × 1pt/時間）
              </span>
              <span
                className="opacity-0"
                style={{ animation: "fade-up 0.5s ease-out 0.4s forwards" }}
              >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand-orange)] align-middle shadow-[0_0_6px_var(--brand-orange)]" />
                活動ポイント:{" "}
                <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-200">
                  {activityPoints}
                </span>{" "}
                pt
              </span>
              <span
                className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 opacity-0"
                style={{ animation: "fade-up 0.5s ease-out 0.55s forwards" }}
              >
                Day {daysSinceJoined.toString().padStart(3, "0")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
