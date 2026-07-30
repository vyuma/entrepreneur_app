import type { TierState } from "@/actions/tier";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import PointsHero from "./PointsHero";
import TierPicker from "./TierPicker";
import TierRoadmap from "./TierRoadmap";

type PointsData = {
  total_points: number;
  activity_points: number;
  time_points: number;
  days_since_joined: number;
  total_minutes: number;
  total_activities: number;
  logs: {
    points: number;
    reason: string;
    period_year: number;
    period_month: number;
    created_at: string;
  }[];
};

/** PointLog.reason を日本語のラベルにする */
function reasonLabel(reason: string): string {
  if (reason === "activity") return "活動実績承認";
  if (reason.startsWith("manual:")) return reason.slice("manual:".length);
  if (reason.startsWith("login_bonus:"))
    return `ログインボーナス（${reason.slice("login_bonus:".length)}）`;
  if (reason.startsWith("morning_task_undo:"))
    return `朝活タスク取り消し（${reason.slice("morning_task_undo:".length)}）`;
  if (reason.startsWith("morning_task:"))
    return `朝活タスク（${reason.slice("morning_task:".length)}）`;
  if (reason.startsWith("morning:"))
    return `朝活チェックイン（${reason.slice("morning:".length)}）`;
  return "時間ボーナス";
}

type Achievement = {
  id: string;
  label: string;
  desc: string;
  unlocked: boolean;
  icon: string;
};

function buildAchievements(
  days: number,
  minutes: number,
  activities: number,
): Achievement[] {
  const dayMilestones = [
    { days: 7, label: "1週間", icon: "🌱" },
    { days: 30, label: "1ヶ月", icon: "🌿" },
    { days: 90, label: "3ヶ月", icon: "🌳" },
    { days: 180, label: "半年", icon: "🏅" },
    { days: 365, label: "1年", icon: "🏆" },
  ];
  const timeMilestones = [
    { minutes: 60, label: "1時間", icon: "⏱️" },
    { minutes: 600, label: "10時間", icon: "🔥" },
    { minutes: 3000, label: "50時間", icon: "💪" },
    { minutes: 6000, label: "100時間", icon: "⭐" },
    { minutes: 30000, label: "500時間", icon: "👑" },
  ];
  const activityMilestones = [
    { count: 1, label: "1回", icon: "🚀" },
    { count: 5, label: "5回", icon: "🎯" },
    { count: 10, label: "10回", icon: "💡" },
    { count: 20, label: "20回", icon: "📈" },
    { count: 30, label: "30回", icon: "🌟" },
    { count: 50, label: "50回", icon: "💎" },
    { count: 100, label: "100回", icon: "👑" },
  ];

  return [
    ...dayMilestones.map((m) => ({
      id: `day-${m.days}`,
      label: `${m.label}経過`,
      desc: `アプリ登録から${m.label}`,
      unlocked: days >= m.days,
      icon: m.icon,
    })),
    ...timeMilestones.map((m) => ({
      id: `time-${m.minutes}`,
      label: `${m.label}達成`,
      desc: `累計作業時間 ${m.label}`,
      unlocked: minutes >= m.minutes,
      icon: m.icon,
    })),
    ...activityMilestones.map((m) => ({
      id: `activity-${m.count}`,
      label: `挑戦 ${m.label}`,
      desc: `活動申請 ${m.label}チャレンジ`,
      unlocked: activities >= m.count,
      icon: m.icon,
    })),
  ];
}

export default async function PointsPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let data: PointsData = {
    total_points: 0,
    activity_points: 0,
    time_points: 0,
    days_since_joined: 0,
    total_minutes: 0,
    total_activities: 0,
    logs: [],
  };
  let tierState: TierState | null = null;
  try {
    [data, tierState] = await Promise.all([
      apiFetch(`/api/points/me?discord_id=${discordId}`),
      apiFetch(`/api/tier?discord_id=${discordId}`),
    ]);
  } catch {
    // バックエンド未起動時はゼロ表示
  }

  const achievements = buildAchievements(
    data.days_since_joined,
    data.total_minutes,
    data.total_activities,
  );
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        ポイント
      </h1>

      {/* 合計ポイント */}
      <PointsHero
        totalPoints={data.total_points}
        activityPoints={data.activity_points}
        timePoints={data.time_points}
        totalMinutes={data.total_minutes}
        daysSinceJoined={data.days_since_joined}
        displayTier={tierState?.display_tier}
      />

      {/* ランクのステップアップ */}
      <TierRoadmap totalPoints={data.total_points} />

      {/* 到達済みの色から選ぶ */}
      {tierState && <TierPicker state={tierState} />}

      {/* 実績 */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          実績
        </h2>

        {unlocked.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">
              解除済み
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {unlocked.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-black dark:text-zinc-50">
                      {a.label}
                    </p>
                    <p className="text-xs text-zinc-400">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">
              未解除
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {locked.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-4 opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-2xl grayscale">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {a.label}
                    </p>
                    <p className="text-xs text-zinc-400">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ポイント履歴 */}
      {data.logs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-black dark:text-zinc-50">
            ポイント履歴
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {reasonLabel(log.reason)}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {log.period_year}年{log.period_month}月
                  </p>
                </div>
                <span className="text-sm font-semibold text-black dark:text-zinc-50">
                  +{log.points} pt
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
