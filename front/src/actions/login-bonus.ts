"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { ClaimResult } from "@/types/login-bonus";

export type ClaimState = {
  ok: boolean;
  message: string;
  result?: ClaimResult;
};

/** 今日のログインボーナスを受け取る */
export async function claimLoginBonus(
  _prev: ClaimState | null,
): Promise<ClaimState> {
  const session = await auth();
  if (!session?.user.discordId) {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const result: ClaimResult = await apiFetch(
      `/api/login-bonus/claim?discord_id=${session.user.discordId}`,
      { method: "POST" },
    );

    revalidatePath("/dashboard");
    revalidatePath("/points");

    return {
      ok: true,
      result,
      message: result.newly_claimed
        ? `+${result.points}pt を獲得しました！（${result.streak}日連続）`
        : "本日分は受け取り済みです",
    };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "不明なエラー";
    const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
    return { ok: false, message: detail ?? "受け取りに失敗しました" };
  }
}
