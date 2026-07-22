"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");

  const snsRaw = formData.get("sns_links") as string;
  let sns_links: Record<string, string> | null = null;
  if (snsRaw?.trim()) {
    try {
      sns_links = JSON.parse(snsRaw);
    } catch {
      // パース失敗時は無視
    }
  }

  await apiFetch(`/api/profile?discord_id=${session.user.discordId}`, {
    method: "PUT",
    body: JSON.stringify({
      display_name: formData.get("display_name") || null,
      bio: formData.get("bio") || null,
      business_desc: formData.get("business_desc") || null,
      sns_links,
    }),
  });

  revalidatePath("/profile");
  revalidatePath("/members");
}
