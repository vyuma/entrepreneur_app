"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";

/**
 * 管理操作の実行者は必ずセッション由来の discord_id を使う。
 * クライアントから discord_id を受け取らないことで、なりすましを防ぐ。
 */
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
    return { ok: true, message: successMessage };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "不明なエラー";
    // apiFetch は "API 403: {"detail":"..."}" 形式で投げる
    const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
    return { ok: false, message: detail ?? raw };
  }
}

// --- ユーザー管理 ---

export async function deleteUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const userId = formData.get("user_id") as string;

  const result = await run(
    () =>
      apiFetch(`/api/admin/users/${userId}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "ユーザーを削除しました",
  );
  revalidatePath("/admin");
  revalidatePath("/members");
  return result;
}

export async function restoreUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const userId = formData.get("user_id") as string;

  const result = await run(
    () =>
      apiFetch(`/api/admin/users/${userId}/restore?discord_id=${discordId}`, {
        method: "POST",
      }),
    "ユーザーを復元しました",
  );
  revalidatePath("/admin");
  revalidatePath("/members");
  return result;
}

export async function setPortfolioVisibility(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const userId = formData.get("user_id") as string;
  const isPublic = formData.get("public") === "true";

  const result = await run(
    () =>
      apiFetch(`/api/admin/users/${userId}/portfolio?discord_id=${discordId}`, {
        method: "PATCH",
        body: JSON.stringify({ public: isPublic }),
      }),
    isPublic
      ? "ポートフォリオを公開しました"
      : "ポートフォリオを非公開にしました",
  );
  revalidatePath("/admin");
  revalidatePath(`/portfolio/${userId}`);
  return result;
}

// --- 権限管理（master のみ） ---

export async function setRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const userId = formData.get("user_id") as string;
  const role = formData.get("role") as string;

  const result = await run(
    () =>
      apiFetch(`/api/admin/users/${userId}/role?discord_id=${discordId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    role === "admin" ? "管理者権限を付与しました" : "管理者権限を剥奪しました",
  );
  revalidatePath("/admin");
  return result;
}

// --- ポイント付与 ---

export async function grantPoints(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const points = Number(formData.get("points"));
  const reason = (formData.get("reason") as string)?.trim();

  if (!Number.isFinite(points) || points === 0) {
    return { ok: false, message: "ポイントは0以外の数値を入力してください" };
  }
  if (!reason) {
    return { ok: false, message: "理由を入力してください" };
  }

  const result = await run(
    () =>
      apiFetch(`/api/admin/points?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          user_id: formData.get("user_id"),
          points,
          reason,
        }),
      }),
    `${points > 0 ? "+" : ""}${points}pt を付与しました`,
  );
  revalidatePath("/admin");
  revalidatePath("/points");
  return result;
}

// --- 自団体イベント ---

export async function createEvent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();

  const result = await run(
    () =>
      apiFetch(`/api/admin/internal-events?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          event_date: formData.get("event_date"),
          event_end_date: formData.get("event_end_date") || null,
          venue: formData.get("venue") || null,
          description: formData.get("description") || null,
        }),
      }),
    "イベントを追加しました",
  );
  revalidatePath("/admin");
  revalidatePath("/competitions");
  return result;
}

export async function deleteEvent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const discordId = await actorId();
  const eventId = formData.get("event_id") as string;

  const result = await run(
    () =>
      apiFetch(
        `/api/admin/internal-events/${eventId}?discord_id=${discordId}`,
        { method: "DELETE" },
      ),
    "イベントを削除しました",
  );
  revalidatePath("/admin");
  revalidatePath("/competitions");
  return result;
}
