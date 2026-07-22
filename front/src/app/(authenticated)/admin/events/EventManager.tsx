"use client";

import { useActionState } from "react";
import { type ActionResult, createEvent, deleteEvent } from "@/actions/admin";
import type { InternalEvent } from "@/types/competition";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-blue)] dark:border-zinc-700 dark:bg-zinc-950";

export default function EventManager({ events }: { events: InternalEvent[] }) {
  const [createState, createAction, creating] = useActionState<
    ActionResult | null,
    FormData
  >(createEvent, null);
  const [deleteState, deleteAction] = useActionState<
    ActionResult | null,
    FormData
  >(deleteEvent, null);

  const message = createState ?? deleteState;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-1 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--brand-blue)" }}
          />
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            自団体イベントを追加
          </h2>
        </div>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          追加したイベントはコンペカレンダー上で青く強調表示されます。
        </p>

        <form
          action={createAction}
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

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              {creating ? "追加中..." : "イベントを追加"}
            </button>
            {message && (
              <p
                className="text-sm"
                style={{
                  color: message.ok
                    ? "var(--brand-green)"
                    : "var(--brand-orange)",
                }}
              >
                {message.message}
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          登録済みイベント（{events.length}件）
        </h2>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-400">まだ登録されていません。</p>
        ) : (
          <ul className="flex flex-col">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800/70"
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-xs tabular-nums text-zinc-400">
                    {e.event_date}
                    {e.event_end_date && ` 〜 ${e.event_end_date}`}
                  </span>
                  <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {e.name}
                  </span>
                  {e.venue && (
                    <span className="text-xs text-zinc-400">@{e.venue}</span>
                  )}
                </span>
                <form action={deleteAction}>
                  <input type="hidden" name="event_id" value={e.id} />
                  <button
                    type="submit"
                    onClick={(ev) => {
                      if (!window.confirm(`「${e.name}」を削除しますか？`))
                        ev.preventDefault();
                    }}
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
    </div>
  );
}
