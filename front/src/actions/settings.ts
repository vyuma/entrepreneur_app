"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { CARD_KEYS } from "@/lib/cards";

async function requireDiscordId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

/** ダッシュボードの表示カード設定を保存する */
export async function saveDashboardPrefs(formData: FormData) {
  const discordId = await requireDiscordId();

  const cards = CARD_KEYS.map((key, i) => ({
    card_key: key,
    visible: formData.get(`card_${key}`) === "on",
    order: i,
  }));

  await apiFetch(`/api/dashboard/prefs?discord_id=${discordId}`, {
    method: "PUT",
    body: JSON.stringify({ cards }),
  });

  revalidatePath("/dashboard");
}

/** スキルタグを追加する */
export async function addSkill(formData: FormData) {
  const discordId = await requireDiscordId();
  const label = (formData.get("label") as string)?.trim();
  if (!label) return;

  await apiFetch(`/api/members/skills?discord_id=${discordId}`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });

  revalidatePath("/profile");
  revalidatePath("/members");
}

export async function removeSkill(formData: FormData) {
  const discordId = await requireDiscordId();
  const skillId = formData.get("skill_id") as string;

  await apiFetch(`/api/members/skills/${skillId}?discord_id=${discordId}`, {
    method: "DELETE",
  });

  revalidatePath("/profile");
  revalidatePath("/members");
}

/** ポートフォリオの公開・非公開を切り替える */
export async function togglePortfolioVisibility(formData: FormData) {
  const discordId = await requireDiscordId();
  const userId = formData.get("user_id") as string;
  const isPublic = formData.get("public") === "on";

  await apiFetch(
    `/api/portfolio/${userId}/visibility?discord_id=${discordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ public: isPublic }),
    },
  );

  revalidatePath(`/portfolio/${userId}`);
  revalidatePath("/profile");
}
