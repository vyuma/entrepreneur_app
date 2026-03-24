import { auth } from "@/auth"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

type TimeSummary = {
  total_minutes: number
  month_minutes: number
  monthly: { year: number; month: number; minutes: number }[]
  recent_logs: { minutes: number; created_at: string }[]
}

function fmt(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

const MONTH_GOAL = 3600 // 月60時間

function CircleProgress({ minutes, goal }: { minutes: number; goal: number }) {
  const r = 72
  const circumference = 2 * Math.PI * r
  const pct = Math.min(minutes / goal, 1)
  const offset = circumference * (1 - pct)

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle
          cx="90" cy="90" r={r}
          fill="none" stroke="currentColor"
          strokeWidth="12"
          className="text-zinc-100 dark:text-zinc-800"
        />
        <circle
          cx="90" cy="90" r={r}
          fill="none" stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-black dark:text-white transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-black dark:text-zinc-50">
          {Math.floor(minutes / 60)}h
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {minutes % 60}m
        </span>
        <span className="mt-1 text-xs text-zinc-400">
          / {Math.floor(goal / 60)}h 目標
        </span>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const discordId = session!.user.discordId
  const now = new Date()

  let summary: TimeSummary = { total_minutes: 0, month_minutes: 0, monthly: [], recent_logs: [] }
  try {
    summary = await apiFetch(`/api/time-logs/summary?discord_id=${discordId}`)
  } catch {
    // バックエンド未起動時はゼロ表示
  }

  const maxMinutes = summary.monthly.length > 0
    ? Math.max(...summary.monthly.map((r) => r.minutes), 1)
    : 1

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">ホーム</h1>

      {/* 今月の円グラフ＋累計 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {now.getFullYear()}年{now.getMonth() + 1}月の作業時間
          </p>
          <CircleProgress minutes={summary.month_minutes} goal={MONTH_GOAL} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            累計 {fmt(summary.total_minutes)}
          </p>
        </div>

        {/* 月別棒グラフ */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">月別作業時間</p>
          {summary.monthly.length === 0 ? (
            <p className="text-sm text-zinc-400 leading-relaxed">
              Discordの専用チャンネルに投稿すると記録されます。
              <br />
              例: <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">2時間勉強した</code>
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-40">
              {summary.monthly.map((r) => {
                const heightPct = Math.round((r.minutes / maxMinutes) * 100)
                const isCurrent = r.year === now.getFullYear() && r.month === now.getMonth() + 1
                return (
                  <div key={`${r.year}-${r.month}`} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500">{Math.floor(r.minutes / 60)}h</span>
                    <div className="w-full flex items-end" style={{ height: "90px" }}>
                      <div
                        className={`w-full rounded-t ${isCurrent ? "bg-black dark:bg-white" : "bg-zinc-300 dark:bg-zinc-600"}`}
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400">{r.month}月</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 直近ログ10件 */}
      {summary.recent_logs.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">直近の記録</p>
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {summary.recent_logs.map((log, i) => {
              const d = new Date(log.created_at)
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {fmt(log.minutes)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {d.getFullYear()}/{d.getMonth() + 1}/{d.getDate()}&nbsp;
                    {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/members", label: "メンバー一覧", desc: "コミュニティメンバーを確認" },
          { href: "/activities", label: "活動実績", desc: "承認済み実績の一覧・申請" },
          { href: "/profile", label: "プロフィール編集", desc: "自己紹介・SNSリンクを更新" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <p className="font-medium text-black dark:text-zinc-50">{item.label}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
