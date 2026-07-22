import { createEntry } from "@/actions/competition";
import SubmitButton from "@/app/components/SubmitButton";
import {
  deadlineBadge,
  formatDate,
  formatPrize,
  formatTeamSize,
} from "@/lib/competition-format";
import { COMPETITION_TYPES, type Competition } from "@/types/competition";

function typeLabel(type: string | null) {
  return (
    COMPETITION_TYPES.find((t) => t.value === type)?.label ?? type ?? "その他"
  );
}

export default function CompetitionCard({
  competition,
  entered,
}: {
  competition: Competition;
  entered: boolean;
}) {
  const badge = deadlineBadge(competition.deadline_date);
  const prize = formatPrize(competition);
  const team = formatTeamSize(competition);
  const eventDay = formatDate(competition.event_date_date);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {typeLabel(competition.type)}
          </span>
          <h3 className="font-semibold leading-snug text-black dark:text-zinc-50">
            {competition.name ?? "（名称不明）"}
          </h3>
        </div>
        {badge && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {competition.organizer && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {competition.organizer}
        </p>
      )}

      {competition.description && (
        <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
          {competition.description}
        </p>
      )}

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {eventDay && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">開催</dt>
            <dd>{eventDay}</dd>
          </div>
        )}
        {competition.venue && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">会場</dt>
            <dd className="max-w-[16rem] truncate">{competition.venue}</dd>
          </div>
        )}
        {prize && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">賞金</dt>
            <dd style={{ color: "var(--brand-yellow)" }}>{prize}</dd>
          </div>
        )}
        {team && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">人数</dt>
            <dd>{team}</dd>
          </div>
        )}
        {competition.score !== null && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">スコア</dt>
            <dd>{competition.score}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <a
          href={competition.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          詳細を見る
        </a>

        {entered ? (
          <span
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            応募登録済み
          </span>
        ) : (
          <form action={createEntry}>
            <input type="hidden" name="url" value={competition.url} />
            <input
              type="hidden"
              name="name"
              value={competition.name ?? competition.url}
            />
            <input type="hidden" name="competition_id" value={competition.id} />
            <input
              type="hidden"
              name="deadline_date"
              value={competition.deadline_date ?? ""}
            />
            <input
              type="hidden"
              name="event_date_date"
              value={competition.event_date_date ?? ""}
            />
            <SubmitButton
              pendingLabel="追加中..."
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              応募に追加
            </SubmitButton>
          </form>
        )}
      </div>
    </article>
  );
}
