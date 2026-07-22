"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { EntryStatus } from "@/types/competition";

async function requireDiscordId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

/** コンペ一覧・推薦画面から応募エントリを登録する */
export async function createEntry(formData: FormData) {
  const discordId = await requireDiscordId();

  const competitionId = formData.get("competition_id");
  await apiFetch(`/api/competitions/entries?discord_id=${discordId}`, {
    method: "POST",
    body: JSON.stringify({
      url: formData.get("url"),
      name: formData.get("name"),
      competition_id: competitionId ? Number(competitionId) : null,
      deadline_date: formData.get("deadline_date") || null,
      event_date_date: formData.get("event_date_date") || null,
      memo: formData.get("memo") || null,
    }),
  }).catch((err: Error) => {
    // 既に登録済み (409) はエラー扱いしない
    if (!err.message.includes("409")) throw err;
  });

  revalidatePath("/competitions");
  revalidatePath("/achievements");
  revalidatePath("/dashboard");
}

/** カンバン上でステータスを移動する */
export async function moveEntry(formData: FormData) {
  const discordId = await requireDiscordId();
  const entryId = formData.get("entry_id") as string;
  const status = formData.get("status") as EntryStatus;

  await apiFetch(
    `/api/competitions/entries/${entryId}?discord_id=${discordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  revalidatePath("/achievements");
  revalidatePath("/dashboard");
  revalidatePath("/activities");
}

/** メモ・結果を更新する */
export async function updateEntryDetail(formData: FormData) {
  const discordId = await requireDiscordId();
  const entryId = formData.get("entry_id") as string;

  await apiFetch(
    `/api/competitions/entries/${entryId}?discord_id=${discordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        memo: (formData.get("memo") as string) ?? null,
        result: (formData.get("result") as string) ?? null,
      }),
    },
  );

  revalidatePath("/achievements");
}

export async function deleteEntry(formData: FormData) {
  const discordId = await requireDiscordId();
  const entryId = formData.get("entry_id") as string;

  await apiFetch(
    `/api/competitions/entries/${entryId}?discord_id=${discordId}`,
    { method: "DELETE" },
  );

  revalidatePath("/achievements");
  revalidatePath("/dashboard");
}

/** 自団体イベントを登録する（カレンダーで青く強調表示される） */
export async function createInternalEvent(formData: FormData) {
  const discordId = await requireDiscordId();

  await apiFetch(`/api/competitions/internal-events?discord_id=${discordId}`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      event_date: formData.get("event_date"),
      event_end_date: formData.get("event_end_date") || null,
      venue: formData.get("venue") || null,
      description: formData.get("description") || null,
    }),
  });

  revalidatePath("/competitions");
}

export async function deleteInternalEvent(formData: FormData) {
  await requireDiscordId();
  const eventId = formData.get("event_id") as string;

  await apiFetch(`/api/competitions/internal-events/${eventId}`, {
    method: "DELETE",
  });

  revalidatePath("/competitions");
}
