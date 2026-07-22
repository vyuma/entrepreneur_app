export type EventPhase = "entry" | "voting" | "closed" | "published";

export type EntryStatus = "pending" | "approved" | "rejected";

export type EventSummary = {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  venue: string | null;
  phase: EventPhase;
  slide_required: boolean;
  created_at: string;
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
};

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
