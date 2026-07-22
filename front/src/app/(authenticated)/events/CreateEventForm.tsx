"use client";

import { useActionState } from "react";
import { createEvent, type EventActionResult } from "@/actions/event";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

export default function CreateEventForm() {
  const [state, action, pending] = useActionState<
    EventActionResult | null,
    FormData
  >(createEvent, null);

  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
        ＋ イベントを作成（管理者）
      </summary>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        作成すると「申込受付中」で公開されます。承認・投票開始・結果発表は各イベントのページから操作します。
      </p>

      <form
        action={action}
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          イベント名
          <input
            type="text"
            name="name"
            required
            maxLength={100}
            placeholder="例: NueStar Pitch 2026"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          説明
          <textarea
            name="description"
            rows={3}
            placeholder="募集要項・審査基準など"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          開催日
          <input type="date" name="event_date" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          会場
          <input
            type="text"
            name="venue"
            placeholder="例: NueStar Discord"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          開始時刻（タイムテーブルの起点）
          <input type="time" name="start_time" className={inputClass} />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          転換時間（秒）
          <input
            type="number"
            name="buffer_seconds"
            defaultValue={60}
            min={0}
            max={1800}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2 dark:text-zinc-300">
          <input
            type="checkbox"
            name="slide_required"
            defaultChecked
            className="h-4 w-4 accent-[var(--brand-green)]"
          />
          承認後にスライドURLの提出を求める
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            {pending ? "作成中..." : "イベントを作成"}
          </button>
          {state && (
            <p
              className="text-sm"
              style={{
                color: state.ok ? "var(--brand-green)" : "var(--brand-orange)",
              }}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
