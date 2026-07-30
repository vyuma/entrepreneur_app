export type Todo = {
  id: string;
  title: string;
  detail: string | null;
  is_done: boolean;
  done_at: string | null;
  /** "discord" / "app"。どこから作られたか */
  source: string;
  created_at: string;
};
