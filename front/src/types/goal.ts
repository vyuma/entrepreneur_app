export type GoalStatus = "active" | "achieved" | "dropped";

export type Goal = {
  id: string;
  title: string;
  detail: string | null;
  /** "YYYY-MM-DD"。期限なしは null */
  target_date: string | null;
  status: GoalStatus;
  achieved_at: string | null;
  /** "discord" / "app"。どこから作られたか */
  source: string;
  created_at: string;
  /** 期限まであと何日か。期限なしは null、過ぎていれば負 */
  days_left: number | null;
  /** 紐づく TODO の件数と、そのうち完了した数 */
  todo_total: number;
  todo_done: number;
};

/** 残り日数がこれ以下なら急かす表示にする */
export const URGENT_DAYS = 7;
