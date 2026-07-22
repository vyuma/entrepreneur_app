"use client";

import { useActionState, useState } from "react";
import { deleteEvent, type EventActionResult } from "@/actions/event";

/**
 * イベント削除。誤操作すると申込・投票・賞がすべて消えるため、
 * 折りたたみ ＋ イベント名の入力 ＋ 確認ダイアログの三段構えにしている。
 */
export default function DangerZone({
  eventId,
  eventName,
  entryCount,
  voteCount,
}: {
  eventId: string;
  eventName: string;
  entryCount: number;
  voteCount: number;
}) {
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<
    EventActionResult | null,
    FormData
  >(deleteEvent, null);

  const matched = typed.trim() === eventName;

  return (
    <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <summary className="cursor-pointer text-xs text-zinc-400">
        危険な操作
      </summary>

      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          このイベントを削除すると、
          <strong className="font-medium">
            申込 {entryCount}件・投票 {voteCount}票・授与した賞
          </strong>
          もすべて消えます。元に戻せません。
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          削除するには、イベント名「
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {eventName}
          </span>
          」を入力してください。
        </p>

        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="event_id" value={eventId} />
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="イベント名を入力"
            aria-label="確認のためイベント名を入力"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand-orange)] dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={!matched || pending}
            onClick={(e) => {
              if (
                !window.confirm(
                  `本当に「${eventName}」を削除しますか？この操作は取り消せません。`,
                )
              ) {
                e.preventDefault();
              }
            }}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-orange)" }}
          >
            {pending ? "削除中..." : "イベントを削除する"}
          </button>
        </form>

        {state && !state.ok && (
          <p className="text-xs" style={{ color: "var(--brand-orange)" }}>
            {state.message}
          </p>
        )}
      </div>
    </details>
  );
}
