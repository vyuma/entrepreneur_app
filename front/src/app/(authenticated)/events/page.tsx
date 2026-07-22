import Link from "next/link";
import { auth } from "@/auth";
import { getAdminMe } from "@/lib/admin";
import { apiFetch } from "@/lib/api";
import {
  ENTRY_STATUS_INFO,
  type EventSummary,
  PHASE_INFO,
} from "@/types/event";
import CreateEventForm from "./CreateEventForm";

export default async function EventsPage() {
  const session = await auth();
  const discordId = session!.user.discordId;
  const me = await getAdminMe();

  let events: EventSummary[] = [];
  let error: string | null = null;
  try {
    events = await apiFetch(`/api/events?discord_id=${discordId}`);
  } catch {
    error = "イベントを取得できませんでした。";
  }

  const active = events.filter((e) => e.phase !== "published");
  const finished = events.filter((e) => e.phase === "published");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          NueStarイベント
        </h1>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        NueStar が主催するコンペです。
        <span style={{ color: "var(--brand-blue)" }}> 申込 </span>→ 承認 →
        <span style={{ color: "var(--brand-green)" }}>
          {" "}
          スライド提出・投票{" "}
        </span>
        → 結果発表の順に進みます。
      </p>

      {error && (
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--brand-orange)",
            color: "var(--brand-orange)",
          }}
        >
          {error}
        </p>
      )}

      {me.is_admin && <CreateEventForm />}

      {events.length === 0 && !error && (
        <p className="text-zinc-500 dark:text-zinc-400">
          開催中のイベントはまだありません。
        </p>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            開催中
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {active.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            終了
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {finished.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
  const phase = PHASE_INFO[event.phase];
  const myStatus = event.my_entry_status
    ? ENTRY_STATUS_INFO[event.my_entry_status]
    : null;

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-black dark:text-zinc-50">
          {event.name}
        </h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: phase.color }}
        >
          {phase.label}
        </span>
      </div>

      {event.description && (
        <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {event.description}
        </p>
      )}

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {event.event_date && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">開催</dt>
            <dd>{event.event_date}</dd>
          </div>
        )}
        {event.venue && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">会場</dt>
            <dd className="max-w-[12rem] truncate">{event.venue}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt className="text-zinc-400">発表</dt>
          <dd className="tabular-nums">{event.approved_count}件</dd>
        </div>
        {event.phase !== "entry" && (
          <div className="flex gap-1">
            <dt className="text-zinc-400">投票</dt>
            <dd className="tabular-nums">{event.vote_count}票</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {myStatus && (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px]"
            style={{ borderColor: myStatus.color, color: myStatus.color }}
          >
            自分の申込: {myStatus.label}
          </span>
        )}
        {event.phase === "voting" && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
            style={{
              backgroundColor: event.has_voted
                ? "var(--brand-blue)"
                : "var(--brand-green)",
            }}
          >
            {event.has_voted ? "投票済み" : "未投票"}
          </span>
        )}
      </div>
    </Link>
  );
}
