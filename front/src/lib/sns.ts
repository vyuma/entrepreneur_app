/** プロフィールで個別入力できる SNS。ここに無いキーは編集時もそのまま保持する。 */
export const SNS_FIELDS = [
  { key: "X", label: "X (Twitter)", placeholder: "https://x.com/..." },
  { key: "GitHub", label: "GitHub", placeholder: "https://github.com/..." },
  {
    key: "Instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/...",
  },
  { key: "Website", label: "Webサイト", placeholder: "https://..." },
] as const;

export type SnsKey = (typeof SNS_FIELDS)[number]["key"];

/** フォーム名（sns_X など）に使う */
export function snsFieldName(key: string): string {
  return `sns_${key}`;
}
