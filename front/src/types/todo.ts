export type Todo = {
  id: string;
  title: string;
  detail: string | null;
  is_done: boolean;
  /** 0=低 / 1=中 / 2=高 */
  priority: number;
  done_at: string | null;
  /** "discord" / "app"。どこから作られたか */
  source: string;
  created_at: string;
};

export const PRIORITY_LOW = 0;
export const PRIORITY_NORMAL = 1;
export const PRIORITY_HIGH = 2;

/** 優先度ごとの表示。バックエンドの PRIORITY_* と対応させる */
export const PRIORITIES = [
  { value: PRIORITY_HIGH, label: "高", color: "var(--brand-orange)" },
  { value: PRIORITY_NORMAL, label: "中", color: "var(--brand-blue)" },
  { value: PRIORITY_LOW, label: "低", color: "#a1a1aa" },
] as const;

export function priorityOf(value: number) {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];
}
