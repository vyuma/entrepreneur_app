import type { CSSProperties } from "react";

/**
 * 全ティアの視覚スタイル定義 (PointsHero / TimeProgress 共通)
 * Tailwind クラスと SVG arcStops の両方を提供する。
 */
export type TierName =
  | "entry"
  | "nuestar"
  | "bronze"
  | "silver"
  | "gold"
  | "ruby"
  | "sapphire"
  | "diamond"
  | "rainbow"
  | "rainbowPrismatic"
  | "prismatic"
  | "supernova"
  | "nebula"
  | "aurora"
  | "eclipse"
  | "quasar"
  | "singularity";

export type TierStyle = {
  name: TierName;
  label: string;
  /** 円形バッジ用の conic gradient (CSS background) */
  ring: string;
  ringInner: string;
  /** 周囲のグロウ色 (radial 用) */
  glow: [string, string];
  /** カードの外周 (Tailwind class) */
  wrapper: string;
  /** バッジ中央の数値スタイル */
  numberStyle?: CSSProperties;
  numberClass: string;
  /** ティアラベル用クラス (e.g. ▸ GOLD TIER) */
  labelClass: string;
  /** 円リングの回転秒数 (低ティアほど遅い) */
  spinSec: number;
  /** バッジに追加で当てる Tailwind class */
  badgeExtraClass?: string;
  /** SVG <linearGradient> 用のストップ群 (進捗アーク向け) */
  arcStops: { offset: string; color: string }[];
};

export const TIER_STYLES: Record<TierName, TierStyle> = {
  entry: {
    name: "entry",
    label: "ENTRY",
    ring: "conic-gradient(from 0deg, #71717a, #d4d4d8, #52525b, #a1a1aa, #71717a)",
    ringInner:
      "conic-gradient(from 180deg, #a1a1aa, #71717a, #d4d4d8, #52525b, #a1a1aa)",
    glow: ["#71717a", "#a1a1aa"],
    wrapper:
      "bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700",
    numberClass: "text-black dark:text-zinc-50",
    labelClass: "text-zinc-500 dark:text-zinc-400",
    spinSec: 12,
    arcStops: [
      { offset: "0%", color: "#a1a1aa" },
      { offset: "50%", color: "#71717a" },
      { offset: "100%", color: "#52525b" },
    ],
  },
  nuestar: {
    name: "nuestar",
    label: "NUESTAR",
    ring: "conic-gradient(from 0deg, var(--brand-green), var(--brand-yellow), var(--brand-orange), var(--brand-blue), var(--brand-green))",
    ringInner:
      "conic-gradient(from 180deg, var(--brand-orange), var(--brand-yellow), var(--brand-green), var(--brand-blue), var(--brand-orange))",
    glow: ["var(--brand-green)", "var(--brand-orange)"],
    wrapper:
      "bg-gradient-to-br from-[var(--brand-green)]/55 via-zinc-300 to-[var(--brand-orange)]/55 dark:from-[var(--brand-green)]/40 dark:via-zinc-700 dark:to-[var(--brand-orange)]/40",
    numberClass:
      "bg-gradient-to-br from-[var(--brand-green)] to-[var(--brand-orange)] bg-clip-text text-transparent",
    labelClass: "text-[var(--brand-green)]",
    spinSec: 9,
    arcStops: [
      { offset: "0%", color: "#2ea84a" },
      { offset: "33%", color: "#1d6fce" },
      { offset: "66%", color: "#ffc83a" },
      { offset: "100%", color: "#e85a1c" },
    ],
  },
  bronze: {
    name: "bronze",
    label: "BRONZE",
    ring: "conic-gradient(from 0deg, #8c5524, #cd7f32, #b87333, #e8a06a, #8c5524)",
    ringInner:
      "conic-gradient(from 180deg, #b87333, #8c5524, #e8a06a, #cd7f32, #b87333)",
    glow: ["#cd7f32", "#d2691e"],
    wrapper:
      "bg-gradient-to-br from-amber-700/70 via-orange-300 to-amber-900/70 dark:from-amber-700/50 dark:via-orange-600/50 dark:to-amber-900/50",
    numberClass:
      "bg-gradient-to-br from-amber-700 to-orange-500 bg-clip-text text-transparent",
    labelClass: "text-amber-700 dark:text-amber-500",
    spinSec: 8,
    arcStops: [
      { offset: "0%", color: "#8c5524" },
      { offset: "50%", color: "#cd7f32" },
      { offset: "100%", color: "#e8a06a" },
    ],
  },
  silver: {
    name: "silver",
    label: "SILVER",
    ring: "conic-gradient(from 0deg, #a1a1aa, #f5f5f5, #71717a, #e5e5e5, #a1a1aa)",
    ringInner:
      "conic-gradient(from 180deg, #e5e5e5, #a1a1aa, #f5f5f5, #71717a, #e5e5e5)",
    glow: ["#cbd5e1", "#94a3b8"],
    wrapper:
      "bg-gradient-to-br from-slate-300 via-slate-100 to-slate-500 dark:from-slate-400 dark:via-slate-200 dark:to-slate-600",
    numberClass:
      "bg-gradient-to-br from-slate-500 to-slate-800 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400",
    labelClass: "text-slate-500 dark:text-slate-300",
    spinSec: 7,
    arcStops: [
      { offset: "0%", color: "#d4d4d8" },
      { offset: "50%", color: "#a1a1aa" },
      { offset: "100%", color: "#71717a" },
    ],
  },
  gold: {
    name: "gold",
    label: "GOLD",
    ring: "conic-gradient(from 0deg, #d4af37, #fff3b0, #b8860b, #ffd700, #d4af37)",
    ringInner:
      "conic-gradient(from 180deg, #ffd700, #d4af37, #fff3b0, #b8860b, #ffd700)",
    glow: ["#ffd700", "#b8860b"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#fff3b0,#ffd700,#d4af37,#ffd700,#fff3b0)]",
    numberClass:
      "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-700 bg-clip-text text-transparent dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400",
    labelClass: "text-amber-600 dark:text-amber-300",
    spinSec: 6,
    arcStops: [
      { offset: "0%", color: "#d4af37" },
      { offset: "50%", color: "#ffd700" },
      { offset: "100%", color: "#b8860b" },
    ],
  },
  ruby: {
    name: "ruby",
    label: "RUBY",
    ring: "conic-gradient(from 0deg, #9b111e, #ff4d6d, #c41e3a, #e0115f, #9b111e)",
    ringInner:
      "conic-gradient(from 180deg, #e0115f, #9b111e, #ff4d6d, #c41e3a, #e0115f)",
    glow: ["#e0115f", "#ff1744"],
    wrapper:
      "bg-gradient-to-br from-rose-400 via-rose-200 to-red-700 dark:from-rose-500 dark:via-rose-300 dark:to-red-900",
    numberClass:
      "bg-gradient-to-br from-rose-500 to-red-700 bg-clip-text text-transparent dark:from-rose-300 dark:to-red-400",
    labelClass: "text-rose-600 dark:text-rose-300",
    spinSec: 5.5,
    arcStops: [
      { offset: "0%", color: "#9b111e" },
      { offset: "50%", color: "#e0115f" },
      { offset: "100%", color: "#ff4d6d" },
    ],
  },
  sapphire: {
    name: "sapphire",
    label: "SAPPHIRE",
    ring: "conic-gradient(from 0deg, #082567, #6b8df3, #0f52ba, #4169e1, #082567)",
    ringInner:
      "conic-gradient(from 180deg, #4169e1, #082567, #6b8df3, #0f52ba, #4169e1)",
    glow: ["#1d6fce", "#4169e1"],
    wrapper:
      "bg-gradient-to-br from-sky-400 via-blue-200 to-indigo-800 dark:from-sky-500 dark:via-blue-300 dark:to-indigo-900",
    numberClass:
      "bg-gradient-to-br from-sky-600 to-indigo-700 bg-clip-text text-transparent dark:from-sky-300 dark:to-indigo-300",
    labelClass: "text-sky-600 dark:text-sky-300",
    spinSec: 5,
    arcStops: [
      { offset: "0%", color: "#082567" },
      { offset: "50%", color: "#0f52ba" },
      { offset: "100%", color: "#6b8df3" },
    ],
  },
  diamond: {
    name: "diamond",
    label: "DIAMOND",
    ring: "conic-gradient(from 0deg, #a5f3fc, #c7d2fe, #fbcfe8, #fde68a, #a5f3fc, #c7d2fe)",
    ringInner:
      "conic-gradient(from 180deg, #fbcfe8, #fde68a, #a5f3fc, #c7d2fe, #fbcfe8)",
    glow: ["#c7d2fe", "#a5f3fc"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#a5f3fc,#c7d2fe,#fbcfe8,#fde68a,#a5f3fc,#c7d2fe)]",
    numberClass:
      "bg-[linear-gradient(110deg,#06b6d4,#6366f1,#ec4899,#f59e0b,#06b6d4)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
    labelClass: "text-cyan-600 dark:text-cyan-300",
    spinSec: 4.5,
    arcStops: [
      { offset: "0%", color: "#a5f3fc" },
      { offset: "33%", color: "#c7d2fe" },
      { offset: "66%", color: "#fbcfe8" },
      { offset: "100%", color: "#fde68a" },
    ],
  },
  rainbow: {
    name: "rainbow",
    label: "RAINBOW",
    ring: "conic-gradient(from 0deg, #ff0044, #ff8800, #ffee00, #00ff66, #00ccff, #6633ff, #ff00cc, #ff0044)",
    ringInner:
      "conic-gradient(from 180deg, #ffee00, #ff0044, #00ff66, #ff8800, #6633ff, #00ccff, #ff00cc, #ffee00)",
    glow: ["#ff0099", "#00ccff"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#ff0044,#ff8800,#ffee00,#00ff66,#00ccff,#6633ff,#ff00cc,#ff0044)]",
    numberClass:
      "bg-[linear-gradient(110deg,#ff0044,#ff8800,#ffee00,#00ff66,#00ccff,#6633ff,#ff00cc,#ff0044)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
    labelClass:
      "bg-[linear-gradient(110deg,#ff0044,#ffee00,#00ccff,#6633ff,#ff0044)] bg-clip-text text-transparent",
    spinSec: 4,
    arcStops: [
      { offset: "0%", color: "#ff0044" },
      { offset: "20%", color: "#ff8800" },
      { offset: "40%", color: "#ffee00" },
      { offset: "55%", color: "#00ff66" },
      { offset: "70%", color: "#00ccff" },
      { offset: "85%", color: "#6633ff" },
      { offset: "100%", color: "#ff00cc" },
    ],
  },
  rainbowPrismatic: {
    name: "rainbowPrismatic",
    label: "RAINBOW PRISMATIC",
    ring: "conic-gradient(from 0deg, #ff5aa8, #ffffff, #5ad9ff, #ffffff, #b8ff5a, #ffffff, #ffd45a, #ffffff, #d45aff, #ff5aa8)",
    ringInner:
      "conic-gradient(from 180deg, #5ad9ff, #ffffff, #ffd45a, #ffffff, #d45aff, #ffffff, #b8ff5a, #ffffff, #ff5aa8, #5ad9ff)",
    glow: ["#ff5aa8", "#5ad9ff"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#ff5aa8,#ffffff,#5ad9ff,#ffffff,#b8ff5a,#ffffff,#ffd45a,#ffffff,#d45aff,#ff5aa8)]",
    numberClass:
      "bg-[linear-gradient(110deg,#ff5aa8,#5ad9ff,#b8ff5a,#ffd45a,#d45aff,#ff5aa8)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]",
    labelClass:
      "bg-[linear-gradient(110deg,#ff5aa8,#5ad9ff,#ffd45a,#d45aff,#ff5aa8)] bg-clip-text text-transparent",
    spinSec: 3.5,
    arcStops: [
      { offset: "0%", color: "#ff5aa8" },
      { offset: "25%", color: "#5ad9ff" },
      { offset: "50%", color: "#b8ff5a" },
      { offset: "75%", color: "#ffd45a" },
      { offset: "100%", color: "#d45aff" },
    ],
  },
  prismatic: {
    name: "prismatic",
    label: "PRISMATIC",
    ring: "conic-gradient(from 0deg, #ffffff, #c0e0ff, #ffd0ff, #fff5d0, #d0ffe0, #ffffff)",
    ringInner:
      "conic-gradient(from 180deg, #ffd0ff, #ffffff, #d0ffe0, #c0e0ff, #fff5d0, #ffd0ff)",
    glow: ["#ffffff", "#c0e0ff"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#ffffff,#c0e0ff,#ffd0ff,#fff5d0,#d0ffe0,#e8e0ff,#ffffff)]",
    numberClass:
      "bg-[linear-gradient(110deg,#7dd3fc,#c084fc,#f472b6,#fde047,#5eead4,#7dd3fc)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]",
    labelClass:
      "bg-[linear-gradient(110deg,#7dd3fc,#c084fc,#f472b6,#fde047,#7dd3fc)] bg-clip-text text-transparent",
    spinSec: 3,
    arcStops: [
      { offset: "0%", color: "#7dd3fc" },
      { offset: "25%", color: "#c084fc" },
      { offset: "50%", color: "#f472b6" },
      { offset: "75%", color: "#fde047" },
      { offset: "100%", color: "#5eead4" },
    ],
  },

  /* --- PRISMATIC の先。淡い光の極みに対して「熱量」と「深宇宙」で格上げする --- */

  supernova: {
    name: "supernova",
    label: "SUPERNOVA",
    ring: "conic-gradient(from 0deg, #ffffff, #ffe9a3, #ff8a3d, #ff2d78, #7a1fa2, #ffffff)",
    ringInner:
      "conic-gradient(from 180deg, #ff8a3d, #ffffff, #ff2d78, #ffe9a3, #7a1fa2, #ff8a3d)",
    glow: ["#ff8a3d", "#ff2d78"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#ffffff,#ffe9a3,#ff8a3d,#ff2d78,#7a1fa2,#ff8a3d,#ffffff)]",
    numberClass:
      "bg-[linear-gradient(110deg,#f59e0b,#f97316,#ec4899,#a21caf,#f59e0b)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,138,61,0.5)]",
    labelClass:
      "bg-[linear-gradient(110deg,#f97316,#ec4899,#a21caf,#f97316)] bg-clip-text text-transparent",
    spinSec: 2.8,
    arcStops: [
      { offset: "0%", color: "#ffe9a3" },
      { offset: "35%", color: "#ff8a3d" },
      { offset: "70%", color: "#ff2d78" },
      { offset: "100%", color: "#7a1fa2" },
    ],
  },
  nebula: {
    name: "nebula",
    label: "NEBULA",
    ring: "conic-gradient(from 0deg, #2a1b5e, #7c3aed, #ec4899, #22d3ee, #4c1d95, #2a1b5e)",
    ringInner:
      "conic-gradient(from 180deg, #ec4899, #2a1b5e, #22d3ee, #7c3aed, #4c1d95, #ec4899)",
    glow: ["#7c3aed", "#ec4899"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#2a1b5e,#7c3aed,#ec4899,#22d3ee,#4c1d95,#2a1b5e)]",
    numberClass:
      "bg-[linear-gradient(110deg,#7c3aed,#ec4899,#22d3ee,#7c3aed)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
    labelClass:
      "bg-[linear-gradient(110deg,#8b5cf6,#ec4899,#22d3ee,#8b5cf6)] bg-clip-text text-transparent",
    spinSec: 2.6,
    arcStops: [
      { offset: "0%", color: "#4c1d95" },
      { offset: "35%", color: "#7c3aed" },
      { offset: "70%", color: "#ec4899" },
      { offset: "100%", color: "#22d3ee" },
    ],
  },
  aurora: {
    name: "aurora",
    label: "AURORA",
    ring: "conic-gradient(from 0deg, #0a1a3f, #2ea84a, #22d3ee, #818cf8, #c084fc, #0a1a3f)",
    ringInner:
      "conic-gradient(from 180deg, #22d3ee, #0a1a3f, #c084fc, #2ea84a, #818cf8, #22d3ee)",
    glow: ["#22d3ee", "#2ea84a"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#0a1a3f,#2ea84a,#22d3ee,#818cf8,#c084fc,#0a1a3f)]",
    numberClass:
      "bg-[linear-gradient(110deg,#2ea84a,#22d3ee,#818cf8,#c084fc,#2ea84a)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
    labelClass:
      "bg-[linear-gradient(110deg,#16a34a,#0891b2,#6366f1,#a855f7,#16a34a)] bg-clip-text text-transparent",
    spinSec: 2.4,
    arcStops: [
      { offset: "0%", color: "#2ea84a" },
      { offset: "35%", color: "#22d3ee" },
      { offset: "70%", color: "#818cf8" },
      { offset: "100%", color: "#c084fc" },
    ],
  },
  eclipse: {
    name: "eclipse",
    label: "ECLIPSE",
    ring: "conic-gradient(from 0deg, #0b0b0f, #b8860b, #ffd700, #fff3b0, #b8860b, #0b0b0f)",
    ringInner:
      "conic-gradient(from 180deg, #ffd700, #0b0b0f, #fff3b0, #b8860b, #0b0b0f, #ffd700)",
    glow: ["#ffd700", "#b8860b"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#0b0b0f,#5c4708,#b8860b,#ffd700,#fff3b0,#b8860b,#0b0b0f)]",
    numberClass:
      "bg-[linear-gradient(110deg,#78350f,#b8860b,#ffd700,#b8860b,#78350f)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
    labelClass:
      "bg-[linear-gradient(110deg,#b8860b,#ffd700,#b8860b)] bg-clip-text text-transparent",
    spinSec: 2.2,
    arcStops: [
      { offset: "0%", color: "#0b0b0f" },
      { offset: "40%", color: "#b8860b" },
      { offset: "75%", color: "#ffd700" },
      { offset: "100%", color: "#fff3b0" },
    ],
  },
  quasar: {
    name: "quasar",
    label: "QUASAR",
    ring: "conic-gradient(from 0deg, #f5f3ff, #8b5cf6, #4c1d95, #06b6d4, #f5f3ff)",
    ringInner:
      "conic-gradient(from 180deg, #06b6d4, #f5f3ff, #4c1d95, #8b5cf6, #06b6d4)",
    glow: ["#8b5cf6", "#06b6d4"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#f5f3ff,#8b5cf6,#4c1d95,#06b6d4,#a5f3fc,#f5f3ff)]",
    numberClass:
      "bg-[linear-gradient(110deg,#6d28d9,#8b5cf6,#06b6d4,#6d28d9)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(139,92,246,0.55)]",
    labelClass:
      "bg-[linear-gradient(110deg,#7c3aed,#06b6d4,#7c3aed)] bg-clip-text text-transparent",
    spinSec: 2,
    arcStops: [
      { offset: "0%", color: "#f5f3ff" },
      { offset: "40%", color: "#8b5cf6" },
      { offset: "75%", color: "#4c1d95" },
      { offset: "100%", color: "#06b6d4" },
    ],
  },
  singularity: {
    name: "singularity",
    label: "SINGULARITY",
    ring: "conic-gradient(from 0deg, #000000, #ff0044, #ffee00, #00ccff, #6633ff, #ff00cc, #000000)",
    ringInner:
      "conic-gradient(from 180deg, #00ccff, #000000, #ff00cc, #ffee00, #6633ff, #ff0044, #00ccff)",
    glow: ["#ff00cc", "#00ccff"],
    wrapper:
      "tier-shimmer bg-[linear-gradient(110deg,#000000,#ff0044,#ffee00,#00ccff,#6633ff,#ff00cc,#000000)]",
    numberClass:
      "bg-[linear-gradient(110deg,#ff0044,#ffee00,#00ccff,#6633ff,#ff00cc,#ff0044)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(255,0,204,0.5)]",
    labelClass:
      "bg-[linear-gradient(110deg,#ff0044,#00ccff,#ff00cc,#ff0044)] bg-clip-text text-transparent",
    spinSec: 1.8,
    arcStops: [
      { offset: "0%", color: "#ff0044" },
      { offset: "25%", color: "#ffee00" },
      { offset: "50%", color: "#00ccff" },
      { offset: "75%", color: "#6633ff" },
      { offset: "100%", color: "#ff00cc" },
    ],
  },
};

export type TierLadder = { threshold: number; tier: TierName }[];

/** value 以下を満たす最も上のティアを返す。ladder は昇順前提。 */
export function resolveTier(value: number, ladder: TierLadder): TierStyle {
  let current = TIER_STYLES[ladder[0].tier];
  for (const { threshold, tier } of ladder) {
    if (value >= threshold) current = TIER_STYLES[tier];
  }
  return current;
}

/** 累計アントレポイント (PointsHero) で使うラダー */
export const POINTS_LADDER: TierLadder = [
  { threshold: 0, tier: "entry" },
  { threshold: 100, tier: "nuestar" },
  { threshold: 200, tier: "bronze" },
  { threshold: 300, tier: "silver" },
  { threshold: 400, tier: "gold" },
  { threshold: 500, tier: "ruby" },
  { threshold: 600, tier: "sapphire" },
  { threshold: 700, tier: "diamond" },
  { threshold: 800, tier: "rainbow" },
  { threshold: 900, tier: "rainbowPrismatic" },
  { threshold: 1000, tier: "prismatic" },
  // ここから先は到達間隔を広げ、長期のやり込み枠にする
  { threshold: 1200, tier: "supernova" },
  { threshold: 1600, tier: "nebula" },
  { threshold: 2100, tier: "aurora" },
  { threshold: 2700, tier: "eclipse" },
  { threshold: 3500, tier: "quasar" },
  { threshold: 5000, tier: "singularity" },
];

/** 月の作業時間 (分単位)。5 時間ごとに切り替え、最大 50h で PRISMATIC。 */
export const TIME_LADDER_MIN: TierLadder = [
  { threshold: 0, tier: "entry" },
  { threshold: 5 * 60, tier: "nuestar" },
  { threshold: 10 * 60, tier: "bronze" },
  { threshold: 15 * 60, tier: "silver" },
  { threshold: 20 * 60, tier: "gold" },
  { threshold: 25 * 60, tier: "ruby" },
  { threshold: 30 * 60, tier: "sapphire" },
  { threshold: 35 * 60, tier: "diamond" },
  { threshold: 40 * 60, tier: "rainbow" },
  { threshold: 45 * 60, tier: "rainbowPrismatic" },
  { threshold: 50 * 60, tier: "prismatic" },
];

export const TIME_MAX_MINUTES = 55 * 60; // 3300
