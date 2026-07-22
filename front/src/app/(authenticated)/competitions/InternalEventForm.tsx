import {
  createInternalEvent,
  deleteInternalEvent,
} from "@/actions/competition";
import type { InternalEvent } from "@/types/competition";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-blue)] dark:border-zinc-700 dark:bg-zinc-900";

export default function InternalEventForm({
  events,
}: {
  events: InternalEvent[];
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-blue)" }}
        />
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          自団体イベント
        </h2>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        登録したイベントはカレンダー上で青く強調表示されます。
      </p>

      <form
        action={createInternalEvent}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <input
          type="text"
          name="name"
          required
          placeholder="イベント名"
          className={`${inputClass} sm:col-span-2`}
        />
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          開催日
          <input
            type="date"
            name="event_date"
            required
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          終了日（任意）
          <input type="date" name="event_end_date" className={inputClass} />
        </label>
        <input
          type="text"
          name="venue"
          placeholder="会場（任意）"
          className={inputClass}
        />
        <input
          type="text"
          name="description"
          placeholder="説明（任意）"
          className={inputClass}
        />
        <button
          type="submit"
          className="justify-self-start rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          イベントを追加
        </button>
      </form>

      {events.length > 0 && (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono text-xs text-zinc-400">
                  {e.event_date}
                </span>
                <span className="truncate text-zinc-700 dark:text-zinc-300">
                  {e.name}
                </span>
                {e.venue && (
                  <span className="hidden shrink-0 text-xs text-zinc-400 sm:inline">
                    @{e.venue}
                  </span>
                )}
              </span>
              <form action={deleteInternalEvent}>
                <input type="hidden" name="event_id" value={e.id} />
                <button
                  type="submit"
                  className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
                >
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
