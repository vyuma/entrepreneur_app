import {
  deleteEntry,
  moveEntry,
  updateEntryDetail,
} from "@/actions/competition";
import { deadlineBadge } from "@/lib/competition-format";
import {
  ENTRY_STATUS_LABELS,
  type Entry,
  type EntryStatus,
} from "@/types/competition";

/** 各ステータスから移動できる先 */
const NEXT_STATUSES: Record<EntryStatus, EntryStatus[]> = {
  challenge: ["wait", "achieve", "dropped"],
  wait: ["achieve", "dropped", "challenge"],
  achieve: ["wait"],
  dropped: ["challenge"],
};

const STATUS_COLOR: Record<EntryStatus, string> = {
  challenge: "var(--brand-blue)",
  wait: "var(--brand-yellow)",
  achieve: "var(--brand-green)",
  dropped: "var(--brand-orange)",
};

export default function EntryCard({
  entry,
  editable,
}: {
  entry: Entry;
  editable: boolean;
}) {
  const badge = deadlineBadge(entry.deadline_date);

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium leading-snug text-black hover:underline dark:text-zinc-50"
        >
          {entry.name}
        </a>
        {badge && entry.status !== "achieve" && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {!editable && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {entry.display_name ?? entry.username}
        </span>
      )}

      {entry.result && (
        <p
          className="text-xs font-medium"
          style={{ color: "var(--brand-green)" }}
        >
          🏆 {entry.result}
        </p>
      )}

      {entry.memo && (
        <p className="whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
          {entry.memo}
        </p>
      )}

      {entry.activity_id && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          活動実績を申請済み
        </span>
      )}

      {editable && (
        <>
          <details className="text-xs">
            <summary className="cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              メモ・結果を編集
            </summary>
            <form
              action={updateEntryDetail}
              className="mt-2 flex flex-col gap-2"
            >
              <input type="hidden" name="entry_id" value={entry.id} />
              <textarea
                name="memo"
                rows={2}
                defaultValue={entry.memo ?? ""}
                placeholder="メモ（本人のみ閲覧）"
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950"
              />
              <input
                type="text"
                name="result"
                defaultValue={entry.result ?? ""}
                placeholder="受賞・結果（例: 最優秀賞）"
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="submit"
                className="self-start rounded-full px-3 py-1 font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--brand-green)" }}
              >
                保存
              </button>
            </form>
          </details>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {NEXT_STATUSES[entry.status].map((next) => (
              <form action={moveEntry} key={next}>
                <input type="hidden" name="entry_id" value={entry.id} />
                <input type="hidden" name="status" value={next} />
                <button
                  type="submit"
                  className="rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:text-white"
                  style={{
                    borderColor: STATUS_COLOR[next],
                    color: STATUS_COLOR[next],
                  }}
                >
                  → {ENTRY_STATUS_LABELS[next]}
                </button>
              </form>
            ))}
            <form action={deleteEntry} className="ml-auto">
              <input type="hidden" name="entry_id" value={entry.id} />
              <button
                type="submit"
                className="text-[11px] text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
              >
                削除
              </button>
            </form>
          </div>
        </>
      )}
    </article>
  );
}
