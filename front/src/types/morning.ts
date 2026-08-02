export type MorningTip = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
};

export type MorningTask = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  complete_on_post: boolean;
};

/** 当日の消化状況つきタスク */
export type MorningTaskState = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  complete_on_post: boolean;
};

export type MorningSetting = {
  enabled: boolean;
  start_minute: number;
  end_minute: number;
  base_points: number;
  roulette_enabled: boolean;
  roulette_min_points: number;
  roulette_max_points: number;
  task_points: number;
  streak_bonus_per_day: number;
  streak_bonus_max: number;
  lucky_enabled: boolean;
  lucky_min_points: number;
  lucky_max_points: number;
  post_points: number;
  post_template: string;
};

export type MorningStatus = {
  enabled: boolean;
  start_at: string;
  end_at: string;
  now_at: string;
  is_open: boolean;
  checked_in_today: boolean;
  checkin_at: string | null;
  streak: number;
  longest_streak: number;
  total_days: number;
  today_points: number;
  base_points: number;
  roulette_enabled: boolean;
  roulette_min: number;
  roulette_max: number;
  task_points: number;
  next_points: number;
  recent_dates: string[];
  tasks: MorningTaskState[];
  tips: MorningTip[];
  done_count: number;
  lucky_pending: boolean;
  lucky_enabled: boolean;
  lucky_min: number;
  lucky_max: number;
  posted_today: boolean;
  post_points: number;
  post_draft: string;
};

export type CheckinResult = {
  newly_checked_in: boolean;
  points: number;
  streak: number;
  lucky_points: number;
  roulette_points: number;
  status: MorningStatus;
};

export type PostResult = {
  posted: boolean;
  points: number;
  status: MorningStatus;
};

export type ToggleResult = {
  delta_points: number;
  status: MorningStatus;
};

export const EMPTY_MORNING_STATUS: MorningStatus = {
  enabled: true,
  start_at: "06:00",
  end_at: "08:00",
  now_at: "00:00",
  is_open: false,
  checked_in_today: false,
  checkin_at: null,
  streak: 0,
  longest_streak: 0,
  total_days: 0,
  today_points: 5,
  base_points: 5,
  roulette_enabled: true,
  roulette_min: 1,
  roulette_max: 5,
  task_points: 1,
  next_points: 6,
  recent_dates: [],
  tasks: [],
  tips: [],
  done_count: 0,
  lucky_pending: false,
  lucky_enabled: true,
  lucky_min: 3,
  lucky_max: 10,
  posted_today: false,
  post_points: 3,
  post_draft: "",
};

export const DEFAULT_MORNING_SETTING: MorningSetting = {
  enabled: true,
  start_minute: 360,
  end_minute: 480,
  base_points: 5,
  roulette_enabled: true,
  roulette_min_points: 1,
  roulette_max_points: 5,
  task_points: 1,
  streak_bonus_per_day: 1,
  streak_bonus_max: 5,
  lucky_enabled: true,
  lucky_min_points: 3,
  lucky_max_points: 10,
  post_points: 3,
  post_template: "",
};

/** 0時からの経過分を "HH:MM" に変換する（<input type="time"> 用） */
export function minuteToTime(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "HH:MM" を0時からの経過分に変換する */
export function timeToMinute(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
