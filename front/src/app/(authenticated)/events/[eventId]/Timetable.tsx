"use client";

import { useActionState } from "react";
import {
  type EventActionResult,
  reorderEntries,
  setEntrySchedule,
  shuffleOrder,
} from "@/actions/event";
import type { EventDetail } from "@/types/event";

/**
 * タイムテーブル。全員が閲覧でき、管理者だけ並べ替え・時刻調整ができる。
 * 発表順は開催中でもいつでも変更できる。
 */
export default function Timetable({ detail }: { detail: EventDetail }) {
  const { event, entries, timetable, is_admin } = detail;

  const [orderState, orderAction, ordering] = useActionState<
    EventActionResult | null,
    FormData
  >(reorderEntries, null);
  const [shuffleState, shuffleAction, shuffling] = useActionState<
    EventActionResult | null,
    FormData
  >(shuffleOrder, null);
  const [scheduleState, scheduleAction] = useActionState<
    EventActionResult | null,
    FormData
  >(setEntrySchedule, null);

  if (timetable.length === 0) return null;

  const byId = new Map(entries.map((e) => [e.id, e]));
  const orderIds = timetable.map((r) => r.entry_id);
  const message = orderState ?? shuffleState ?? scheduleState;

  /** i 番目を delta 方向へ動かした並び順を文字列で返す */
  const movedOrder = (i: number, delta: number) => {
    const next = [...orderIds];
    const j = i + delta;
    if (j < 0 || j >= next.length) return next.join(",");
    [next[i], next[j]] = [next[j], next[i]];
    return next.join(",");
  };

  const totalMinutes = Math.round(event.total_seconds / 60);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          タイムテーブル
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-zinc-400">
          {event.start_time ? `${event.start_time} 開始 · ` : ""}全
          {timetable.length}件 / 約{totalMinutes}分
        </span>
      </div>

      {!event.start_time && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          開始時刻が未設定のため、順番と所要時間のみ表示しています。
        </p>
      )}

      {is_admin && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <form action={shuffleAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <button
              type="submit"
              disabled={shuffling}
              onClick={(e) => {
                if (!window.confirm("発表順をランダムに決め直しますか？")) {
                  e.preventDefault();
                }
              }}
              className="rounded-full px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-blue)" }}
            >
              {shuffling ? "抽選中..." : "🎲 発表順をランダムに決める"}
            </button>
          </form>
          <span className="text-xs text-zinc-400">
            ↑↓ で個別に入れ替えできます（開催中も変更可）
          </span>
        </div>
      )}

      {message && (
        <p
          className="mb-2 text-xs"
          style={{
            color: message.ok ? "var(--brand-green)" : "var(--brand-orange)",
          }}
        >
          {message.message}
        </p>
      )}

      <ol className="flex flex-col">
        {timetable.map((row, i) => {
          const entry = byId.get(row.entry_id);
          if (!entry) return null;

          return (
            <li
              key={row.entry_id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800/70"
            >
              <span className="w-6 shrink-0 text-center font-mono text-sm tabular-nums text-zinc-400">
                {row.order}
              </span>

              {row.start_time && (
                <span
                  className="shrink-0 font-mono text-sm tabular-nums"
                  style={{
                    color: row.is_fixed ? "var(--brand-orange)" : undefined,
                  }}
                  title={row.is_fixed ? "時刻が固定されています" : undefined}
                >
                  {row.start_time}
                  <span className="text-zinc-400">〜{row.end_time}</span>
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {entry.title}
                </span>
                <span className="text-xs text-zinc-400">
                  {entry.team_name}
                  {entry.presenters && `・${entry.presenters}`}
                </span>
              </span>

              <span className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-400">
                {row.duration_label}
                {row.qa_seconds > 0 && "（質疑込）"}
              </span>

              {is_admin && (
                <span className="flex shrink-0 items-center gap-1">
                  <form action={orderAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input
                      type="hidden"
                      name="entry_ids"
                      value={movedOrder(i, -1)}
                    />
                    <button
                      type="submit"
                      disabled={ordering || i === 0}
                      aria-label="上へ"
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={orderAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input
                      type="hidden"
                      name="entry_ids"
                      value={movedOrder(i, 1)}
                    />
                    <button
                      type="submit"
                      disabled={ordering || i === timetable.length - 1}
                      aria-label="下へ"
                      className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                    >
                      ↓
                    </button>
                  </form>

                  {/* 開始時刻の固定（空欄で自動計算に戻す） */}
                  <form
                    action={scheduleAction}
                    className="flex items-center gap-1"
                  >
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="entry_id" value={row.entry_id} />
                    <input
                      type="time"
                      name="scheduled_at"
                      defaultValue={entry.scheduled_at ?? ""}
                      title="この発表の開始時刻を固定（空欄で自動）"
                      className="w-24 rounded border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <button
                      type="submit"
                      className="rounded px-1.5 py-0.5 text-[11px] text-zinc-400 hover:text-[var(--brand-green)]"
                    >
                      固定
                    </button>
                  </form>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
