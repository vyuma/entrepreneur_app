"use client";

import { useEffect, useId, useState } from "react";
import { resolveTier, TIME_LADDER_MIN, TIME_MAX_MINUTES } from "@/lib/tiers";

type Props = {
  year: number;
  month: number;
  minutes: number;
  totalMinutes: number;
};

function fmt(minutes: number) {
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

export default function TimeProgressCard({
  year,
  month,
  minutes,
  totalMinutes,
}: Props) {
  const gradientId = useId().replace(/:/g, "");
  const tier = resolveTier(minutes, TIME_LADDER_MIN);
  const displayed = useCountUp(minutes);

  const r = 72;
  const cx = 90;
  const cy = 90;
  const c = 2 * Math.PI * r;
  const pct = Math.min(minutes / TIME_MAX_MINUTES, 1);
  const offset = c * (1 - pct);

  const dh = Math.floor(displayed / 60);
  const dm = displayed % 60;
  const goalH = TIME_MAX_MINUTES / 60;

  return (
    <div
      className={`rounded-xl ${tier.wrapper} p-px transition-all duration-500`}
    >
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[11px] bg-white p-6 dark:bg-zinc-900">
        {/* 背後の拍動グロウ */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 block h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${tier.glow[0]} 0%, transparent 70%)`,
            animation: "points-glow 4s ease-in-out infinite",
            opacity: 0.6,
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 block h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, ${tier.glow[1]} 0%, transparent 70%)`,
            animation: "points-glow 4s ease-in-out 1.2s infinite",
            opacity: 0.5,
          }}
        />

        <p className="relative text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {year}年{month}月の作業時間
        </p>

        {/* SVG 進捗アーク (ティアグラデーション) */}
        <div className="relative flex items-center justify-center">
          <svg
            width="180"
            height="180"
            className="-rotate-90"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={`time-arc-${gradientId}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                {tier.arcStops.map((s) => (
                  <stop key={s.offset} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
            {/* 背景トラック */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-zinc-100 dark:text-zinc-800"
            />
            {/* アーク下層 (ブラーで発光) */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={`url(#time-arc-${gradientId})`}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="opacity-40 blur-[2px] transition-all duration-700"
            />
            {/* メインアーク */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={`url(#time-arc-${gradientId})`}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span
              className={`font-mono text-3xl font-bold tabular-nums ${tier.numberClass}`}
              style={tier.numberStyle}
            >
              {dh}h
            </span>
            <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
              {dm}m
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              / {goalH}h MAX
            </span>
          </div>
        </div>

        {/* ティアラベル */}
        <p
          key={tier.name}
          className={`font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${tier.labelClass}`}
          style={{ animation: "fade-up 0.4s ease-out forwards" }}
        >
          ▸ {tier.label} TIER
        </p>

        <p className="relative text-sm text-zinc-500 dark:text-zinc-400">
          累計 {fmt(totalMinutes)}
        </p>
      </div>
    </div>
  );
}
