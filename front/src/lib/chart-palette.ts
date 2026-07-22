/**
 * グラフ用のカテゴリカルパレット。
 *
 * ブランドカラー（緑・オレンジ・青）を軸に、色覚多様性・コントラストの
 * 検証を通した並び順で固定している。系列が増えても順番は変えない
 * （順位ではなく対象に色が紐づくようにするため）。
 *
 * light: surface #fcfcfb / dark: surface #18181b の両方で
 *   明度バンド・彩度下限・CVD分離・通常視分離・コントラスト の全チェックを通過。
 */
export const CATEGORICAL_LIGHT = [
  "#2ea84a", // brand green
  "#a855f7",
  "#e85a1c", // brand orange
  "#1d6fce", // brand blue
  "#a16207",
] as const;

export const CATEGORICAL_DARK = [
  "#3fae59",
  "#a170e0",
  "#e0703a",
  "#4a8fd6",
  "#b8862f",
] as const;

/** 単一系列のグラフに使う色 */
export const SINGLE_SERIES = {
  points: { light: "#2ea84a", dark: "#3fae59" },
  members: { light: "#1d6fce", dark: "#4a8fd6" },
} as const;

/** グラフに載せる最大系列数。これを超える分は「その他」に畳む */
export const MAX_SERIES = 5;
