import type { Competition } from "@/types/competition";

/** 締切までの残日数。日付不明なら null。 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** 締切バッジの文言と色。7日以内はオレンジ、それ以降は緑、過ぎたらグレー。 */
export function deadlineBadge(iso: string | null | undefined): {
  label: string;
  color: string;
} | null {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (days < 0) return { label: "締切済み", color: "var(--brand-blue)" };
  if (days === 0) return { label: "本日締切", color: "var(--brand-orange)" };
  if (days <= 7)
    return { label: `残り${days}日`, color: "var(--brand-orange)" };
  return { label: `残り${days}日`, color: "var(--brand-green)" };
}

export function formatPrize(c: Competition): string | null {
  if (c.prize) return c.prize;
  if (c.prize_amount) return `${c.prize_amount.toLocaleString()}円`;
  return null;
}

export function formatTeamSize(c: Competition): string | null {
  if (c.team_size_min && c.team_size_max) {
    return `${c.team_size_min}〜${c.team_size_max}人`;
  }
  if (c.team_size_min) return `${c.team_size_min}人〜`;
  if (c.team_size_max) return `〜${c.team_size_max}人`;
  return null;
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** キャッシュ鮮度の表示用 */
export function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
