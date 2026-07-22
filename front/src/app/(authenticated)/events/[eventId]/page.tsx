import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { type EventDetail, PHASE_INFO } from "@/types/event";
import AdminPanel from "./AdminPanel";
import EntryList from "./EntryList";
import MyEntryPanel from "./MyEntryPanel";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await auth();
  const discordId = session!.user.discordId;

  let detail: EventDetail;
  try {
    detail = await apiFetch(`/api/events/${eventId}?discord_id=${discordId}`);
  } catch {
    notFound();
  }

  const { event } = detail;
  const phase = PHASE_INFO[event.phase];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/events"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← NueStarイベント一覧
      </Link>

      {/* ヘッダー */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {event.name}
          </h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: phase.color }}
          >
            {phase.label}
          </span>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">{phase.hint}</p>

        {event.description && (
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {event.description}
          </p>
        )}

        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {event.event_date && (
            <div className="flex gap-1.5">
              <dt className="text-zinc-400">開催日</dt>
              <dd>{event.event_date}</dd>
            </div>
          )}
          {event.venue && (
            <div className="flex gap-1.5">
              <dt className="text-zinc-400">会場</dt>
              <dd>{event.venue}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt className="text-zinc-400">発表</dt>
            <dd className="tabular-nums">{event.approved_count}件</dd>
          </div>
          {event.phase !== "entry" && (
            <div className="flex gap-1.5">
              <dt className="text-zinc-400">投票</dt>
              <dd className="tabular-nums">{event.vote_count}票</dd>
            </div>
          )}
        </dl>
      </header>

      {/* 進行状況 */}
      <ol className="flex flex-wrap gap-2 text-[11px]">
        {(["entry", "voting", "closed", "published"] as const).map((p, i) => {
          const info = PHASE_INFO[p];
          const order = ["entry", "voting", "closed", "published"];
          const done = order.indexOf(event.phase) >= i;
          return (
            <li
              key={p}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{
                borderColor: done ? info.color : undefined,
                color: done ? info.color : undefined,
              }}
            >
              <span className="font-mono tabular-nums">{i + 1}</span>
              {info.label}
            </li>
          );
        })}
      </ol>

      {detail.is_admin && <AdminPanel detail={detail} />}

      <MyEntryPanel detail={detail} />

      <EntryList detail={detail} myUserId={detail.my_entry?.user_id ?? null} />
    </div>
  );
}
