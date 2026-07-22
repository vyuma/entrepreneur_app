"use client";

import { useActionState } from "react";
import {
  type EventActionResult,
  reviewEntry,
  setEventPhase,
} from "@/actions/event";
import { type EventDetail, type EventPhase, PHASE_INFO } from "@/types/event";
import DangerZone from "./DangerZone";

const PHASE_ORDER: EventPhase[] = ["entry", "voting", "closed", "published"];

function Message({ state }: { state: EventActionResult | null }) {
  if (!state) return null;
  return (
    <p
      className="text-xs"
      style={{ color: state.ok ? "var(--brand-green)" : "var(--brand-orange)" }}
    >
      {state.message}
    </p>
  );
}

/** 管理者だけに見える運営ボード。承認・フェーズ操作・集計をまとめている。 */
export default function AdminPanel({ detail }: { detail: EventDetail }) {
  const { event, pending_entries, voters, entries } = detail;

  const [phaseState, phaseAction, phasePending] = useActionState<
    EventActionResult | null,
    FormData
  >(setEventPhase, null);
  const [reviewState, reviewAction] = useActionState<
    EventActionResult | null,
    FormData
  >(reviewEntry, null);
  const notVoted = voters.filter((v) => !v.voted);
  const totalVotes = entries.reduce((sum, e) => sum + (e.vote_count ?? 0), 0);

  return (
    <section className="flex flex-col gap-5 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-orange)" }}
        />
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          管理者ボード
        </h2>
      </div>

      {/* フェーズ操作 */}
      <div>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          フェーズを進める（現在:{" "}
          <span style={{ color: PHASE_INFO[event.phase].color }}>
            {PHASE_INFO[event.phase].label}
          </span>
          ）
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {PHASE_ORDER.map((p) => {
            const info = PHASE_INFO[p];
            const isCurrent = event.phase === p;
            return (
              <form action={phaseAction} key={p}>
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="phase" value={p} />
                <button
                  type="submit"
                  disabled={phasePending || isCurrent}
                  onClick={(e) => {
                    if (
                      p === "published" &&
                      !window.confirm(
                        "結果を全員に公開します。よろしいですか？",
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-100"
                  style={
                    isCurrent
                      ? { backgroundColor: info.color, color: "#fff" }
                      : { border: `1px solid ${info.color}`, color: info.color }
                  }
                >
                  {isCurrent ? `✓ ${info.label}` : info.label}
                </button>
              </form>
            );
          })}
        </div>
        <Message state={phaseState} />
      </div>

      {/* 承認待ち */}
      <div>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          申込の承認（
          {pending_entries.filter((e) => e.status === "pending").length}
          件が承認待ち）
        </p>

        {pending_entries.length === 0 ? (
          <p className="text-xs text-zinc-400">未処理の申込はありません。</p>
        ) : (
          <ul className="flex flex-col">
            {pending_entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-2 border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800/70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-700 dark:text-zinc-300">
                    {entry.title}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {entry.display_name || entry.username}
                    {entry.status === "rejected" && " · 却下済み"}
                  </span>
                </span>

                {entry.status !== "approved" && (
                  <form action={reviewAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="entry_id" value={entry.id} />
                    <input type="hidden" name="approve" value="true" />
                    <button
                      type="submit"
                      className="rounded-full px-3 py-1 text-[11px] font-medium text-white"
                      style={{ backgroundColor: "var(--brand-green)" }}
                    >
                      承認
                    </button>
                  </form>
                )}
                {entry.status === "pending" && (
                  <form action={reviewAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="entry_id" value={entry.id} />
                    <input type="hidden" name="approve" value="false" />
                    <button
                      type="submit"
                      className="rounded-full border px-3 py-1 text-[11px]"
                      style={{
                        borderColor: "var(--brand-orange)",
                        color: "var(--brand-orange)",
                      }}
                    >
                      却下
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <Message state={reviewState} />
      </div>

      {/* 集計 */}
      {event.phase !== "entry" && (
        <div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            集計（合計 {totalVotes} 票 / 未投票 {notVoted.length} 名）
            {event.phase !== "published" &&
              "　※ 結果はまだ参加者に見えていません"}
          </p>

          <ul className="flex flex-col">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-t border-zinc-100 py-2 first:border-t-0 dark:border-zinc-800/70"
              >
                <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-zinc-400">
                  {e.rank ?? "-"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {e.title}
                </span>
                {/* 得票の帯 */}
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 sm:block dark:bg-zinc-800">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${totalVotes ? ((e.vote_count ?? 0) / totalVotes) * 100 : 0}%`,
                      backgroundColor: "var(--brand-green)",
                    }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-black dark:text-zinc-50">
                  {e.vote_count ?? 0}票
                </span>
              </li>
            ))}
          </ul>

          {notVoted.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-zinc-400">
                未投票のメンバー（{notVoted.length}名）
              </summary>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {notVoted.map((v) => v.name).join("、")}
              </p>
            </details>
          )}
        </div>
      )}

      {/* 削除（誤操作防止のため名前入力を必須にしている） */}
      <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <DangerZone
          eventId={event.id}
          eventName={event.name}
          entryCount={event.entry_count}
          voteCount={event.vote_count}
        />
      </div>
    </section>
  );
}
