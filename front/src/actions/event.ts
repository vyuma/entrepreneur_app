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
          team_name: formData.get("team_name"),
          presenters: formData.get("presenters"),
          // 「その他」を選んだ場合は分数入力を優先する
          talk_seconds:
            Number(formData.get("talk_custom_min") || 0) * 60 ||
            Number(formData.get("talk_seconds")),
          qa_seconds:
            Number(formData.get("qa_custom_min") || 0) * 60 ||
            Number(formData.get("qa_seconds")),
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
          start_time: formData.get("start_time") || null,
          buffer_seconds: Number(formData.get("buffer_seconds") || 60),
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

// --- タイムテーブル（管理者） ---

/** 発表順をランダムに決め直す */
export async function shuffleOrder(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/shuffle?discord_id=${discordId}`, {
        method: "POST",
      }),
    "発表順をランダムに決めました。",
    [`/events/${eventId}`],
  );
}

/**
 * 発表順を並べ替える。
 * entry_ids に並べ替え後の順序を渡す。開催中でもいつでも変更できる。
 */
export async function reorderEntries(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const entryIds = (formData.get("entry_ids") as string)
    .split(",")
    .filter(Boolean);

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/order?discord_id=${discordId}`, {
        method: "PUT",
        body: JSON.stringify({ entry_ids: entryIds }),
      }),
    "発表順を更新しました。",
    [`/events/${eventId}`],
  );
}

/** 特定の発表の開始時刻を固定する（空欄で自動計算に戻す） */
export async function setEntrySchedule(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const entryId = formData.get("entry_id") as string;

  return run(
    () =>
      apiFetch(
        `/api/events/${eventId}/entries/${entryId}/schedule?discord_id=${discordId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            scheduled_at: formData.get("scheduled_at") || null,
          }),
        },
      ),
    "開始時刻を更新しました。",
    [`/events/${eventId}`],
  );
}

/** 発表時間・質疑時間を管理者が調整する */
export async function setEntryTime(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const entryId = formData.get("entry_id") as string;

  return run(
    () =>
      apiFetch(
        `/api/events/${eventId}/entries/${entryId}/time?discord_id=${discordId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            talk_seconds: Number(formData.get("talk_seconds")),
            qa_seconds: Number(formData.get("qa_seconds")),
          }),
        },
      ),
    "時間を更新しました。",
    [`/events/${eventId}`],
  );
}

// --- 賞（管理者） ---

export async function grantAward(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const name =
    (formData.get("name_custom") as string)?.trim() ||
    (formData.get("name") as string);

  if (!name) return { ok: false, message: "賞の名前を入力してください" };

  return run(
    () =>
      apiFetch(`/api/events/${eventId}/awards?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          entry_id: formData.get("entry_id"),
          name,
          note: formData.get("note") || null,
          points: Number(formData.get("points") || 0),
        }),
      }),
    `「${name}」を授与しました。`,
    [`/events/${eventId}`, "/points", "/members"],
  );
}

export async function revokeAward(
  _prev: EventActionResult | null,
  formData: FormData,
): Promise<EventActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;
  const awardId = formData.get("award_id") as string;

  return run(
    () =>
      apiFetch(
        `/api/events/${eventId}/awards/${awardId}?discord_id=${discordId}`,
        { method: "DELETE" },
      ),
    "賞を取り消しました。付与したポイントも打ち消しました。",
    [`/events/${eventId}`, "/points", "/members"],
  );
}
