import { apiFetch } from "@/lib/api"
import Link from "next/link"

type Activity = {
  id: string
  user_id: string
  event_name: string
  outcome: string
  activity_date_start: string
  activity_date_end: string
  total_participants: number
  points_awarded: number | null
  status: string
  created_at: string
}

export default async function ActivitiesPage() {
  const activities: Activity[] = await apiFetch("/api/activities")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">活動実績一覧</h1>
        <Link
          href="/activities/new"
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + 申請する
        </Link>
      </div>

      {activities.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">承認済みの活動実績はまだありません。</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-black dark:text-zinc-50">{a.event_name}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.outcome}</p>
                  <p className="text-xs text-zinc-400">
                    {a.activity_date_start} 〜 {a.activity_date_end}・参加者 {a.total_participants} 名
                  </p>
                </div>
                {a.points_awarded != null && (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    {a.points_awarded} pt
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
