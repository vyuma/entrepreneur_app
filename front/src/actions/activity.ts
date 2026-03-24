"use server"

import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import { redirect } from "next/navigation"

export async function createActivity(formData: FormData) {
  const session = await auth()
  if (!session?.user.discordId) throw new Error("Not authenticated")

  await apiFetch(`/api/activities?discord_id=${session.user.discordId}`, {
    method: "POST",
    body: JSON.stringify({
      activity_date_start: formData.get("activity_date_start"),
      activity_date_end: formData.get("activity_date_end"),
      event_name: formData.get("event_name"),
      outcome: formData.get("outcome"),
      claim_text: formData.get("claim_text"),
      total_participants: Number(formData.get("total_participants")),
    }),
  })

  redirect("/activities")
}
