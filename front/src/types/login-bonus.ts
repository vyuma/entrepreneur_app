import type { TierName } from "@/lib/tiers";

export type RewardStep = { days: number; points: number };

export type LoginBonusStatus = {
  claimed_today: boolean;
  streak: number;
  longest_streak: number;
  total_days: number;
  today_points: number;
  next_points: number;
  max_points: number;
  title: string;
  title_tier: TierName;
  recent_dates: string[];
  rewards: RewardStep[];
  total_points: number;
  display_tier: TierName;
};

export type ClaimResult = {
  newly_claimed: boolean;
  points: number;
  streak: number;
  title: string;
  title_tier: TierName;
  status: LoginBonusStatus;
};

export const EMPTY_STATUS: LoginBonusStatus = {
  claimed_today: false,
  streak: 0,
  longest_streak: 0,
  total_days: 0,
  today_points: 10,
  next_points: 15,
  max_points: 50,
  title: "ルーキー",
  title_tier: "entry",
  recent_dates: [],
  rewards: [],
  total_points: 0,
  display_tier: "entry",
};
