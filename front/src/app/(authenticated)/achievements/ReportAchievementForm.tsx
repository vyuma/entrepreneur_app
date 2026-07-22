import { reportAchievement } from "@/actions/competition";
import SubmitButton from "@/app/components/SubmitButton";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/**
 * 成果を直接登録するフォーム。
 * ボードに応募を登録していない受賞（学内表彰、過去の実績など）も
 * ここから1ステップでポートフォリオに反映できる。
 */
export default function ReportAchievementForm() {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
        🏆 成果を報告する
      </summary>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        コンペ一覧に無い受賞や、過去の実績もここから登録できます。登録すると「成果」に並び、
        ポートフォリオと受賞数に反映され、活動実績として自動申請されます。
      </p>

      <form
        action={reportAchievement}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          コンペ・イベント名
          <input
            type="text"
            name="name"
            required
            placeholder="例: 学生ビジネスコンテスト2026"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          受賞・結果
          <input
            type="text"
            name="result"
            required
            placeholder="例: 最優秀賞"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          日付（任意）
          <input type="date" name="event_date_date" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          URL（任意）
          <input
            type="url"
            name="url"
            placeholder="https://..."
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          メモ（任意・本人のみ閲覧）
          <textarea name="memo" rows={2} className={inputClass} />
        </label>

        <SubmitButton
          pendingLabel="登録しています..."
          className="justify-self-start rounded-full px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          成果として登録
        </SubmitButton>
      </form>
    </details>
  );
}
