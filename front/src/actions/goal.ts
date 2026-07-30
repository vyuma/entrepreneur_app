"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Goal, GoalStatus } from "@/types/goal";

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

export type GoalState = {
  ok: boolean;
  message: string;
  /** 更新後の目標。削除時は undefined */
  goal?: Goal;
};

async function run(
  fn: (discordId: string) => Promise<Goal | null>,
  successMessage: string,
): Promise<GoalState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const goal = await fn(discordId);
    revalidatePath("/goals");
    return { ok: true, message: successMessage, goal: goal ?? undefined };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

/** 目標を立てる（詳細・期限は任意） */
export async function createGoal(
  title: string,
  detail: string | null,
  targetDate: string | null,
): Promise<GoalState> {
  if (!title.trim()) {
    return { ok: false, message: "目標を入力してください" };
  }
  return run(
    (discordId) =>
      apiFetch(`/api/goals?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          detail: detail?.trim() || null,
          target_date: targetDate || null,
        }),
      }),
    "目標を追加しました",
  );
}

/** タイトル・詳細・期限を更新する。期限を空にすると外れる */
export async function updateGoal(
  goalId: string,
  title: string,
  detail: string,
  targetDate: string,
): Promise<GoalState> {
  if (!title.trim()) {
    return { ok: false, message: "目標を入力してください" };
  }
  return run(
    (discordId) =>
      apiFetch(`/api/goals/${goalId}?discord_id=${discordId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          detail,
          target_date: targetDate || null,
          clear_target_date: !targetDate,
        }),
      }),
    "保存しました",
  );
}

/** 進行中・達成・取り下げを切り替える */
export async function setGoalStatus(
  goalId: string,
  status: GoalStatus,
): Promise<GoalState> {
  const messages: Record<GoalStatus, string> = {
    active: "進行中に戻しました",
    achieved: "達成しました",
    dropped: "取り下げました",
  };
  return run(
    (discordId) =>
      apiFetch(`/api/goals/${goalId}/status?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    messages[status],
  );
}

export async function deleteGoal(goalId: string): Promise<GoalState> {
  return run(
    (discordId) =>
      apiFetch(`/api/goals/${goalId}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "削除しました",
  );
}
