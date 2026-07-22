/** ダッシュボードに配置できるカード（バックエンドの CARD_KEYS と対応） */
export const CARD_KEYS = [
  "time_progress",
  "entry_summary",
  "upcoming_deadlines",
  "week_calendar",
  "monthly_chart",
] as const;

export type CardKey = (typeof CARD_KEYS)[number];

export const CARD_LABELS: Record<CardKey, string> = {
  time_progress: "今月の作業時間",
  entry_summary: "応募状況サマリー",
  upcoming_deadlines: "直近の締切",
  week_calendar: "週次アクティビティ",
  monthly_chart: "月別グラフ",
};
