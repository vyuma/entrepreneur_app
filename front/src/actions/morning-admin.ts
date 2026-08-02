"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { timeToMinute } from "@/types/morning";

async function actorId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

export type ActionResult = { ok: boolean; message: string };

async function run(
  fn: () => Promise<unknown>,
  successMessage: string,
): Promise<ActionResult> {
  try {
    await fn();
    revalidatePath("/admin/morning");
    revalidatePath("/morning");
    return { ok: true, message: successMessage };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "不明なエラー";
    const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
    return { ok: false, message: detail ?? raw };
  }
}

function num(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? 0);
}

// --- 時間帯・ポイント設定 ---

export async function saveMorningSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const body = {
    enabled: formData.get("enabled") === "on",
    start_minute: timeToMinute((formData.get("start_at") as string) || "06:00"),
    end_minute: timeToMinute((formData.get("end_at") as string) || "08:00"),
    base_points: num(formData, "base_points"),
    roulette_enabled: formData.get("roulette_enabled") === "on",
    roulette_min_points: num(formData, "roulette_min_points"),
    roulette_max_points: num(formData, "roulette_max_points"),
    task_points: num(formData, "task_points"),
    streak_bonus_per_day: num(formData, "streak_bonus_per_day"),
    streak_bonus_max: num(formData, "streak_bonus_max"),
    lucky_enabled: formData.get("lucky_enabled") === "on",
    lucky_min_points: num(formData, "lucky_min_points"),
    lucky_max_points: num(formData, "lucky_max_points"),
    post_points: num(formData, "post_points"),
    post_template: ((formData.get("post_template") as string) || "").trim(),
  };

  return run(
    () =>
      apiFetch(`/api/morning/admin/settings?discord_id=${discordId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    "朝活の設定を保存しました",
  );
}

// --- 朝にすべきことリスト ---

function taskBody(formData: FormData) {
  return {
    title: (formData.get("title") as string)?.trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
    sort_order: num(formData, "sort_order"),
    is_active: formData.get("is_active") === "on",
    complete_on_post: formData.get("complete_on_post") === "on",
  };
}

export async function createMorningTask(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  return run(
    () =>
      apiFetch(`/api/morning/admin/tasks?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify(taskBody(formData)),
      }),
    "リスト項目を追加しました",
  );
}

export async function updateMorningTask(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const id = formData.get("task_id") as string;
  return run(
    () =>
      apiFetch(`/api/morning/admin/tasks/${id}?discord_id=${discordId}`, {
        method: "PUT",
        body: JSON.stringify(taskBody(formData)),
      }),
    "リスト項目を更新しました",
  );
}

export async function deleteMorningTask(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const id = formData.get("task_id") as string;
  return run(
    () =>
      apiFetch(`/api/morning/admin/tasks/${id}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "リスト項目を削除しました（消化履歴がある項目は非表示になります）",
  );
}

// --- 朝活のコツ ---

function tipBody(formData: FormData) {
  return {
    title: (formData.get("title") as string)?.trim(),
    body: (formData.get("body") as string)?.trim(),
    sort_order: num(formData, "sort_order"),
    is_active: formData.get("is_active") === "on",
  };
}

export async function createMorningTip(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  return run(
    () =>
      apiFetch(`/api/morning/admin/tips?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify(tipBody(formData)),
      }),
    "Tips を追加しました",
  );
}

export async function updateMorningTip(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const id = formData.get("tip_id") as string;
  return run(
    () =>
      apiFetch(`/api/morning/admin/tips/${id}?discord_id=${discordId}`, {
        method: "PUT",
        body: JSON.stringify(tipBody(formData)),
      }),
    "Tips を更新しました",
  );
}

export async function deleteMorningTip(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const id = formData.get("tip_id") as string;
  return run(
    () =>
      apiFetch(`/api/morning/admin/tips/${id}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "Tips を削除しました",
  );
}
