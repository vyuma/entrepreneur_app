"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";

async function actorId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

export type EventActionResult = { ok: boolean; message: string };

async function run(
  fn: () => Promise<unknown>,
  successMessage: string,
  paths: string[],
): Promise<EventActionResult> {
  try {
    await fn();
    for (const p of paths) revalidatePath(p);
    return { ok: true, message: successMessage };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "不明なエラー";
    const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
    return { ok: false, message: detail ?? raw };
  }
}

// --- 参加者向け ---

/** 申込フォームを送信する */
export async function applyToEvent(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/entries?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          summary: formData.get("summary") || null,
          team_name: formData.get("team_name") || null,
        }),
      }),
    "申し込みました。管理者の承認をお待ちください。",
    [`/events/${eventId}`, "/events"],
  );
}

/** 承認後にスライドURLを提出する */
export async function submitSlide(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(
        `/api/events/${eventId}/entries/me/slide?discord_id=${discordId}`,
        {
          method: "PUT",
          body: JSON.stringify({ slide_url: formData.get("slide_url") }),
        },
      ),
    "スライドURLを登録しました。",
    [`/events/${eventId}`],
  );
}

/** 申込を取り下げる */
export async function withdrawEntry(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/entries/me?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "申込を取り下げました。",
    [`/events/${eventId}`, "/events"],
  );
}

/** 投票する（1人1票・入れ直し可） */
export async function castVote(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/vote?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          entry_id: formData.get("entry_id"),
          comment: formData.get("comment") || null,
        }),
      }),
    "投票しました。",
    [`/events/${eventId}`, "/events"],
  );
}

// --- 管理者向け ---

export async function createEvent(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();

  return run(
    () =>
      apiFetch(`/api/events?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description") || null,
          event_date: formData.get("event_date") || null,
          venue: formData.get("venue") || null,
          slide_required: formData.get("slide_required") === "on",
        }),
      }),
    "イベントを作成しました。",
    ["/events"],
  );
}

/** フェーズを進める（申込受付 → 投票 → 締切 → 結果発表） */
export async function setEventPhase(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const phase = formData.get("phase") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}?discord_id=${discordId}`, {
        method: "PATCH",
        body: JSON.stringify({ phase }),
      }),
    "フェーズを変更しました。",
    [`/events/${eventId}`, "/events"],
  );
}

/** 申込を承認・却下する */
export async function reviewEntry(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const entryId = formData.get("entry_id") as string;
  const approve = formData.get("approve") === "true";

  return run(
    () =>
      apiFetch(
        `/api/events/${eventId}/entries/${entryId}/review?discord_id=${discordId}`,
        {
          method: "POST",
          body: JSON.stringify({
            approve,
            reject_reason: formData.get("reject_reason") || null,
          }),
        },
      ),
    approve ? "承認しました。" : "却下しました。",
    [`/events/${eventId}`, "/events"],
  );
}

export async function deleteEvent(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "イベントを削除しました。",
    ["/events"],
  );
}
