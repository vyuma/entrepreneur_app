"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { CheckinResult, PostResult, ToggleResult } from "@/types/morning";

/** 操作者は必ずセッション由来の discord_id を使う（なりすまし防止） */
async function actorId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

function detailOf(err: unknown): string {
  const raw = err instanceof Error ? err.message : "不明なエラー";
  return raw.match(/"detail":"([^"]+)"/)?.[1] ?? raw;
}

export type CheckinState = {
  ok: boolean;
  message: string;
  result?: CheckinResult;
};

/** 朝活チェックイン（受付時間内のみ成功する） */
export async function checkinMorning(
  _prev: CheckinState | null,
): Promise<CheckinState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const result: CheckinResult = await apiFetch(
      `/api/morning/checkin?discord_id=${discordId}`,
      { method: "POST" },
    );
    revalidatePath("/morning");
    revalidatePath("/dashboard");
    revalidatePath("/points");
    return {
      ok: true,
      result,
      message: result.newly_checked_in
        ? `+${result.points}pt を獲得しました！（${result.streak}日連続の朝活）`
        : "本日分はチェックイン済みです",
    };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

export type PostState = {
  ok: boolean;
  message: string;
  result?: PostResult;
};

/** 朝活宣言を自分の times チャンネルに投稿する */
export async function postMorningDeclaration(
  _prev: PostState | null,
  formData: FormData,
): Promise<PostState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  const content = ((formData.get("content") as string) ?? "").trim();
  if (!content) {
    return { ok: false, message: "投稿する文章を入力してください" };
  }

  try {
    const result: PostResult = await apiFetch(
      `/api/morning/post?discord_id=${discordId}`,
      { method: "POST", body: JSON.stringify({ content }) },
    );
    revalidatePath("/morning");
    revalidatePath("/points");
    return {
      ok: true,
      result,
      message: result.posted
        ? `Discord に投稿しました！ +${result.points}pt`
        : `記録しました（+${result.points}pt）が、Discord への投稿に失敗しました`,
    };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

export type ToggleState = {
  ok: boolean;
  message: string;
  result?: ToggleResult;
};

/** 朝活タスクの消化状態を切り替える */
export async function toggleMorningTask(
  _prev: ToggleState | null,
  formData: FormData,
): Promise<ToggleState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  const taskId = formData.get("task_id") as string;
  const done = formData.get("done") === "true";

  try {
    const result: ToggleResult = await apiFetch(
      `/api/morning/tasks/${taskId}/toggle?discord_id=${discordId}`,
      { method: "POST", body: JSON.stringify({ done }) },
    );
    revalidatePath("/morning");
    revalidatePath("/points");
    return {
      ok: true,
      result,
      message:
        result.delta_points > 0
          ? `+${result.delta_points}pt`
          : result.delta_points < 0
            ? `${result.delta_points}pt`
            : "",
    };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}
