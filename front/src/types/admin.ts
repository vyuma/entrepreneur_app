export type AdminRole = "master" | "admin" | "member";

export type AdminMe = {
  discord_id: string;
  role: AdminRole;
  is_admin: boolean;
  is_master: boolean;
};

export type AdminUser = {
  id: string;
  discord_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AdminRole;
  portfolio_public: boolean;
  deleted_at: string | null;
  created_at: string;
  total_points: number;
  total_hours: number;
};

export type AdminPointLog = {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  reference_id: string | null;
  period_year: number;
  period_month: number;
  created_at: string;
  username: string | null;
  display_name: string | null;
};

export type MonthlyPoint = { period: string; points: number };

export type MemberTrend = {
  user_id: string;
  name: string;
  total_points: number;
  monthly: MonthlyPoint[];
};

export type AdminStats = {
  total_members: number;
  active_members: number;
  deleted_members: number;
  admin_count: number;
  total_points: number;
  total_hours: number;
  total_entries: number;
  total_achievements: number;
  monthly_points: MonthlyPoint[];
  monthly_members: MonthlyPoint[];
  member_trends: MemberTrend[];
};

export type AuditLog = {
  id: string;
  actor_discord_id: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
};

export const ACTION_LABELS: Record<string, string> = {
  grant_points: "ポイント付与",
  delete_user: "ユーザー削除",
  restore_user: "ユーザー復元",
  set_role: "権限変更",
  set_portfolio_visibility: "ポートフォリオ公開設定",
  create_event: "イベント作成",
  delete_event: "イベント削除",
};
