export type EventPhase = "entry" | "voting" | "closed" | "published";

export type EntryStatus = "pending" | "approved" | "rejected";

export type Award = {
  id: string;
  entry_id: string;
  name: string;
  note: string | null;
  points: number;
  created_at: string;
  entry_title: string | null;
  winner_name: string | null;
};

export type TimetableRow = {
  entry_id: string;
  order: number;
  start_time: string | null;
  end_time: string | null;
  talk_seconds: number;
  qa_seconds: number;
  duration_seconds: number;
  duration_label: string;
  is_fixed: boolean;
};

export type EventSummary = {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  phase: EventPhase;
  slide_required: boolean;
  start_time: string | null;
  buffer_seconds: number;
  created_at: string;
  total_seconds: number;
  entry_count: number;
  approved_count: number;
  vote_count: number;
  my_entry_status: EntryStatus | null;
  has_voted: boolean;
};

export type EventEntry = {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  summary: string | null;
  team_name: string | null;
  presenters: string | null;
  talk_seconds: number;
  qa_seconds: number;
  order_index: number | null;
  scheduled_at: string | null;
  status: EntryStatus;
  slide_url: string | null;
  reject_reason: string | null;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  vote_count: number | null;
  rank: number | null;
  voted_by_me: boolean;
  awards: Award[];
};

export type VoterRow = {
  user_id: string;
  name: string;
  voted: boolean;
};

export type EventDetail = {
  event: EventSummary;
  entries: EventEntry[];
  my_entry: EventEntry | null;
  my_vote_entry_id: string | null;
  results_visible: boolean;
  is_admin: boolean;
  pending_entries: EventEntry[];
  voters: VoterRow[];
  timetable: TimetableRow[];
  awards: Award[];
};

/** 申込フォームの発表時間の選択肢（秒） */
export const TALK_OPTIONS = [
  { seconds: 30, label: "30秒", hint: "エレベーターピッチ" },
  { seconds: 60, label: "1分", hint: "" },
  { seconds: 120, label: "2分", hint: "ハッカソン中間発表" },
  { seconds: 180, label: "3分", hint: "Tongaliアイディアピッチ" },
  { seconds: 300, label: "5分", hint: "ビジコン準決勝・標準" },
  { seconds: 420, label: "7分", hint: "ビジコン決勝" },
  { seconds: 600, label: "10分", hint: "Lightning Talk" },
  { seconds: 720, label: "12分", hint: "オーディション" },
] as const;

/** 質疑時間の選択肢（秒）。0 は「必要ない」 */
export const QA_OPTIONS = [
  { seconds: 0, label: "必要ない", hint: "" },
  { seconds: 60, label: "1分", hint: "標準1質問" },
  { seconds: 180, label: "3分", hint: "標準2〜3質問" },
  { seconds: 300, label: "5分", hint: "アイディアピッチ等" },
  { seconds: 420, label: "7分", hint: "" },
  { seconds: 600, label: "10分", hint: "" },
] as const;

/** 賞のプリセット */
export const AWARD_PRESETS = [
  "オーディエンス賞",
  "NueStar賞",
  "最優秀賞",
  "審査員特別賞",
] as const;

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m && s) return `${m}分${s}秒`;
  if (m) return `${m}分`;
  return `${s}秒`;
}

/** フェーズの表示情報。色はブランドカラーのみ使う。 */
export const PHASE_INFO: Record<
  EventPhase,
  { label: string; color: string; hint: string }
> = {
  entry: {
    label: "申込受付中",
    color: "var(--brand-blue)",
    hint: "参加したい人は申込フォームから応募してください。",
  },
  voting: {
    label: "投票受付中",
    color: "var(--brand-green)",
    hint: "発表を見て、一番良かったものに1票入れてください。",
  },
  closed: {
    label: "投票締切",
    color: "var(--brand-orange)",
    hint: "投票は締め切られました。結果発表をお待ちください。",
  },
  published: {
    label: "結果発表",
    color: "var(--brand-yellow)",
    hint: "結果が公開されました。",
  },
};

export const ENTRY_STATUS_INFO: Record<
  EntryStatus,
  { label: string; color: string }
> = {
  pending: { label: "承認待ち", color: "var(--brand-yellow)" },
  approved: { label: "承認済み", color: "var(--brand-green)" },
  rejected: { label: "却下", color: "var(--brand-orange)" },
};
