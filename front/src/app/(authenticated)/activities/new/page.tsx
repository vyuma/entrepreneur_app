import { createActivity } from "@/actions/activity"

export default function NewActivityPage() {
  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">活動実績申請</h1>

      <form action={createActivity} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">イベント・活動名</label>
          <input
            name="event_name"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">開始日</label>
            <input
              type="date"
              name="activity_date_start"
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">終了日</label>
            <input
              type="date"
              name="activity_date_end"
              required
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">活動種別（複数選択可）</label>
          <div className="flex flex-wrap gap-3">
            {["参加", "賞の獲得", "登壇", "運営", "その他"].map((label) => (
              <label key={label} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="activity_type"
                  value={label}
                  className="rounded border-zinc-300 dark:border-zinc-700"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">関連URL</label>
          <input
            type="url"
            name="url"
            placeholder="https://..."
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">そこから学んだこと/賞の内容</label>
          <textarea
            name="learning"
            rows={4}
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">全体の参加者数</label>
          <input
            type="number"
            name="total_participants"
            min={1}
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          申請する
        </button>
      </form>
    </div>
  )
}
