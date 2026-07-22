import { saveDashboardPrefs } from "@/actions/settings";
import SubmitButton from "@/app/components/SubmitButton";
import { CARD_KEYS, CARD_LABELS } from "@/lib/cards";
import type { DashboardCard } from "@/types/competition";

/** 図の「設定カード」。表示するカードの ON/OFF を保存する。 */
export default function DashboardSettings({
  cards,
}: {
  cards: DashboardCard[];
}) {
  const visible = new Map(cards.map((c) => [c.card_key, c.visible]));

  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer text-sm text-zinc-500 dark:text-zinc-400">
        表示するカードを設定
      </summary>
      <form action={saveDashboardPrefs} className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {CARD_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                name={`card_${key}`}
                defaultChecked={visible.get(key) ?? true}
                className="h-4 w-4 accent-[var(--brand-green)]"
              />
              {CARD_LABELS[key]}
            </label>
          ))}
        </div>
        <SubmitButton
          pendingLabel="保存中..."
          className="self-start rounded-full px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          保存
        </SubmitButton>
      </form>
    </details>
  );
}
