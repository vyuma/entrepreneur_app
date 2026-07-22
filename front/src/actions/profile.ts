"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { SNS_FIELDS, snsFieldName } from "@/lib/sns";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");

  // SNS は個別入力。フォームに無いキー（過去にJSONで入れたもの）は消さずに残す。
  const existingRaw = formData.get("sns_existing") as string;
  let sns_links: Record<string, string> = {};
  if (existingRaw?.trim()) {
    try {
      sns_links = JSON.parse(existingRaw);
    } catch {
      // 壊れていた場合は空から作り直す
    }
  }

  for (const { key } of SNS_FIELDS) {
    const value = (formData.get(snsFieldName(key)) as string)?.trim();
    if (value) {
      sns_links[key] = value;
    } else {
      delete sns_links[key];
    }
  }

  await apiFetch(`/api/profile?discord_id=${session.user.discordId}`, {
    method: "PUT",
    body: JSON.stringify({
      display_name: formData.get("display_name") || null,
      bio: formData.get("bio") || null,
      business_desc: formData.get("business_desc") || null,
      sns_links: Object.keys(sns_links).length > 0 ? sns_links : null,
    }),
  });

  revalidatePath("/profile");
  revalidatePath("/members");
}
