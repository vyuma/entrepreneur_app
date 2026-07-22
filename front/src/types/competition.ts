export type Competition = {
  id: number;
  url: string;
  type: string | null;
  name: string | null;
  organizer: string | null;
  deadline: string | null;
  deadline_date: string | null;
  event_date: string | null;
  event_date_date: string | null;
  event_end_date: string | null;
  venue: string | null;
  prize: string | null;
  prize_amount: number | null;
  target: string | null;
  difficulty: string | null;
  team_size_min: number | null;
  team_size_max: number | null;
  description: string | null;
  score: number | null;
};

export type CompetitionList = {
  fetched_at: string;
  count: number;
  items: Competition[];
};

export type CompetitionSearch = {
  fetched_at: string;
  query: string;
  interpretation: string;
  count: number;
  results: Competition[];
};

export type EntryStatus = "challenge" | "wait" | "achieve" | "dropped";

export type Entry = {
  id: string;
  user_id: string;
  competition_id: number | null;
  url: string;
  name: string;
  status: EntryStatus;
  memo: string | null;
  result: string | null;
  deadline_date: string | null;
  event_date_date: string | null;
  activity_id: string | null;
  applied_at: string;
  decided_at: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type InternalEvent = {
  id: string;
  name: string;
  event_date: string;
  event_end_date: string | null;
  venue: string | null;
  description: string | null;
};

export type DashboardCard = {
  card_key: string;
  visible: boolean;
  order: number;
};

export type DashboardSummary = {
  entries: {
    challenge: number;
    wait: number;
    achieve: number;
    dropped: number;
  };
  upcoming: {
    entry_id: string;
    name: string;
    url: string;
    deadline_date: string;
    days_left: number;
  }[];
  week: { date: string; minutes: number }[];
  cards: DashboardCard[];
};

export type Portfolio = {
  user_id: string;
  discord_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  business_desc: string | null;
  sns_links: Record<string, string> | null;
  public: boolean;
  total_points: number;
  total_hours: number;
  achievement_count: number;
  skills: string[];
  items: {
    date: string;
    kind: "activity" | "achievement";
    title: string;
    body: string | null;
    points: number | null;
    url: string | null;
  }[];
};

export const COMPETITION_TYPES = [
  { value: "hackathon", label: "ハッカソン" },
  { value: "bizcon", label: "ビジコン" },
  { value: "academia", label: "学術" },
  { value: "startup", label: "スタートアップ" },
  { value: "acceleration", label: "アクセラ" },
  { value: "networking", label: "交流" },
] as const;

export const ENTRY_STATUS_LABELS: Record<EntryStatus, string> = {
  challenge: "応募",
  wait: "結果待ち",
  achieve: "成果",
  dropped: "見送り",
};
