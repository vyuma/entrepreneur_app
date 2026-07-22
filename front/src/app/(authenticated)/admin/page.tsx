import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { AdminStats } from "@/types/admin";
import ChartFrame from "./charts/ChartFrame";
import { MembersTrend, PointsTrend } from "./charts/CommunityTrend";
import MemberTrendChart from "./charts/MemberTrendChart";

const EMPTY: AdminStats = {
  total_members: 0,
  active_members: 0,
  deleted_members: 0,
  admin_count: 0,
  total_points: 0,
  total_hours: 0,
  total_entries: 0,
  total_achievements: 0,
  monthly_points: [],
  monthly_members: [],
  member_trends: [],
};

export default async function AdminDashboardPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let stats = EMPTY;
  let error: string | null = null;
  try {
    stats = await apiFetch(
      `/api/admin/stats?discord_id=${discordId}&months=12`,
    );
  } catch {
    error = "統計を取得できませんでした。";
  }

  const tiles = [
    {
      label: "在籍メンバー",
      value: stats.active_members,
      unit: "名",
      color: "var(--brand-green)",
    },
    {
      label: "管理者",
      value: stats.admin_count,
      unit: "名",
      color: "var(--brand-blue)",
    },
    {
      label: "累計ポイント",
      value: stats.total_points,
      unit: "pt",
      color: "var(--brand-orange)",
    },
    {
      label: "累計作業時間",
      value: stats.total_hours,
      unit: "h",
      color: "var(--brand-blue)",
    },
    {
      label: "応募エントリ",
      value: stats.total_entries,
      unit: "件",
      color: "var(--brand-green)",
    },
    {
      label: "受賞・成果",
      value: stats.total_achievements,
      unit: "件",
      color: "var(--brand-orange)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--brand-orange)",
            color: "var(--brand-orange)",
          }}
        >
          {error}
        </p>
      )}

      {/* 数値タイル：単一の値はグラフにせずそのまま見せる */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
              {t.label}
            </p>
            <p
              className="mt-1 text-2xl font-semibold tabular-nums"
              style={{ color: t.color }}
            >
              {t.value.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal">{t.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {stats.deleted_members > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          削除済みユーザー {stats.deleted_members}
          名（ユーザータブから復元できます）
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartFrame
          title="月別の付与ポイント"
          subtitle="活動実績・手動付与の合計（直近12ヶ月）"
        >
          <PointsTrend data={stats.monthly_points} />
        </ChartFrame>

        <ChartFrame
          title="メンバー数の推移"
          subtitle="月末時点の累計（直近12ヶ月）"
        >
          <MembersTrend data={stats.monthly_members} />
        </ChartFrame>
      </div>

      <ChartFrame
        title="メンバー別ポイント推移"
        subtitle="累計ポイント上位5名。残りは「その他」に合算しています"
      >
        <MemberTrendChart trends={stats.member_trends} />
      </ChartFrame>
    </div>
  );
}
