import { auth } from "@/auth"
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

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:  { label: "審査中", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  approved: { label: "承認済", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  rejected: { label: "却下",   className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
}

function ActivityCard({ a }: { a: Activity }) {
  const s = STATUS_LABEL[a.status] ?? { label: a.status, className: "" }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-black dark:text-zinc-50">{a.event_name}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.outcome}</p>
          <p className="text-xs text-zinc-400">
            {a.activity_date_start} 〜 {a.activity_date_end}・参加者 {a.total_participants} 名
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.className}`}>
            {s.label}
          </span>
          {a.points_awarded != null && (
            <span className="text-sm font-medium text-black dark:text-zinc-50">
              {a.points_awarded} pt
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function ActivitiesPage() {
  const session = await auth()
  const discordId = session!.user.discordId

  let myActivities: Activity[] = []
  let allApproved: Activity[] = []

  try {
    myActivities = await apiFetch(`/api/activities?discord_id=${discordId}`)
  } catch {
    // バックエンド未起動時は空リスト
  }
  try {
    allApproved = await apiFetch("/api/activities")
  } catch {
    // バックエンド未起動時は空リスト
  }

  // 自分の承認済みを除いた全体リスト
  const myIds = new Set(myActivities.map((a) => a.id))
  const othersApproved = allApproved.filter((a) => !myIds.has(a.id))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">活動実績</h1>
        <Link
          href="/activities/new"
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + 申請する
        </Link>
      </div>

      {/* 自分の申請 */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">自分の申請</h2>
        {myActivities.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            申請はまだありません。「+ 申請する」から活動を報告しましょう。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myActivities.map((a) => <ActivityCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* 他メンバーの承認済み実績 */}
      {othersApproved.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-black dark:text-zinc-50">メンバーの承認済み実績</h2>
          <div className="flex flex-col gap-3">
            {othersApproved.map((a) => <ActivityCard key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  )
}
