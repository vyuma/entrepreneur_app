"use client";

import { useActionState } from "react";
import { castVote, type EventActionResult } from "@/actions/event";
import {
  type EventDetail,
  type EventEntry,
  formatSeconds,
} from "@/types/event";

const RANK_COLOR = [
  "var(--brand-yellow)",
  "#a1a1aa",
  "var(--brand-orange)",
] as const;

export default function EntryList({
  detail,
  myUserId,
}: {
  detail: EventDetail;
  myUserId: string | null;
}) {
  const [state, action, pending] = useActionState<
    EventActionResult | null,
    FormData
  >(castVote, null);

  const { event, entries, my_vote_entry_id, results_visible } = detail;
  const voting = event.phase === "voting";

  if (entries.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        承認された発表はまだありません。
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          発表一覧（{entries.length}件）
        </h2>
        {voting && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            1人1票・自分の発表には投票できません
            {my_vote_entry_id && "（入れ直せます）"}
          </span>
        )}
      </div>

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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            eventId={event.id}
            voting={voting}
            resultsVisible={results_visible}
            isMine={entry.user_id === myUserId}
            isMyVote={my_vote_entry_id === entry.id}
            action={action}
            pending={pending}
          />
        ))}
      </div>
    </section>
  );
}

function EntryCard({
  entry,
  eventId,
  voting,
  resultsVisible,
  isMine,
  isMyVote,
  action,
  pending,
}: {
  entry: EventEntry;
  eventId: string;
  voting: boolean;
  resultsVisible: boolean;
  isMine: boolean;
  isMyVote: boolean;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const rankColor =
    entry.rank && entry.rank <= 3 ? RANK_COLOR[entry.rank - 1] : null;

  return (
    <article
      className={`flex flex-col gap-2 rounded-xl border bg-white p-5 dark:bg-zinc-900 ${
        isMyVote
          ? "border-[var(--brand-green)]"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-black dark:text-zinc-50">
            {entry.title}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {entry.team_name ? `${entry.team_name}・` : ""}
            {entry.display_name || entry.username}
            {isMine && "（あなた）"}
          </p>
        </div>

        {resultsVisible && entry.rank && (
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: rankColor ?? "var(--brand-blue)" }}
          >
            {entry.rank}位 · {entry.vote_count}票
          </span>
        )}
      </div>

      {entry.summary && (
        <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {entry.summary}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {entry.slide_url ? (
          <a
            href={entry.slide_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            スライドを見る
          </a>
        ) : (
          <span className="text-xs text-zinc-400">スライド未提出</span>
        )}

        {voting &&
          (isMine ? (
            <span className="text-xs text-zinc-400">
              自分には投票できません
            </span>
          ) : (
            <form action={action}>
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="entry_id" value={entry.id} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                style={
                  isMyVote
                    ? {
                        backgroundColor: "var(--brand-green)",
                        color: "#fff",
                      }
                    : {
                        border: "1px solid var(--brand-green)",
                        color: "var(--brand-green)",
                      }
                }
              >
                {isMyVote ? "✓ 投票中" : "この発表に投票"}
              </button>
            </form>
          ))}
      </div>
    </article>
  );
}
