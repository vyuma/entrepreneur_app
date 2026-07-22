"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { TierName } from "@/lib/tiers";

export type TierState = {
  total_points: number;
  current_tier: TierName;
  display_tier: TierName;
  preference: TierName | null;
  unlocked: TierName[];
};

export type TierActionResult = {
  ok: boolean;
  message: string;
  state?: TierState;
};

/** 表示に使うランク色を変更する。"auto" を渡すと現在ランクに自動追従。 */
export async function setDisplayTier(
  _prev: TierActionResult | null,
  formData: FormData,
): Promise<TierActionResult> {
  const session = await auth();
  if (!session?.user.discordId) {
    return { ok: false, message: "ログインが必要です" };
  }

  const raw = formData.get("tier") as string;
  const tier = raw === "auto" ? null : raw;

  try {
    const state: TierState = await apiFetch(
      `/api/tier?discord_id=${session.user.discordId}`,
      { method: "PUT", body: JSON.stringify({ tier }) },
    );

    revalidatePath("/points");
    revalidatePath("/dashboard");
    revalidatePath("/members");

    return {
      ok: true,
      state,
      message:
        tier === null ? "現在ランクに自動追従します" : "ランク色を変更しました",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    const detail = msg.match(/"detail":"([^"]+)"/)?.[1];
    return { ok: false, message: detail ?? "変更に失敗しました" };
  }
}
