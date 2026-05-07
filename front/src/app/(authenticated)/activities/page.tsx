import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";

type Activity = {
  id: string;
  user_id: string;
  event_name: string;
  outcome: string;
  activity_date_start: string;
  activity_date_end: string;
  total_participants: number;
  points_awarded: number | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: {
    label: "審査中",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  approved: {
    label: "承認済",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  rejected: {
    label: "却下",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

type Tier = {
  name: "basic" | "sapphire" | "gold" | "diamond";
  label: string;
  /** ラッパー (グラデーション枠) のクラス */
  wrapper: string;
  /** ポイント表示の装飾 */
  pointTextClass: string;
};

function getTier(pt: number | null): Tier | null {
  if (pt == null || pt < 10) return null;
  if (pt < 30) {
    return {
      name: "basic",
      label: "BRONZE",
      wrapper:
        "rounded-xl bg-gradient-to-br from-zinc-300 via-zinc-200 to-zinc-400 p-px dark:from-zinc-600 dark:via-zinc-500 dark:to-zinc-700",
      pointTextClass: "text-zinc-800 dark:text-zinc-100",
    };
  }
  if (pt < 50) {
    return {
      name: "sapphire",
      label: "SAPPHIRE",
      wrapper:
        "rounded-xl bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-700 p-[1.5px] shadow-[0_0_14px_-4px_rgba(59,130,246,0.55)] dark:from-sky-400 dark:via-blue-500 dark:to-indigo-700",
      pointTextClass:
        "bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-transparent dark:from-sky-300 dark:to-indigo-300",
    };
  }
  if (pt < 80) {
    return {
      name: "gold",
      label: "GOLD",
      wrapper:
        "rounded-xl bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 p-[2px] shadow-[0_0_16px_-3px_rgba(245,158,11,0.6)] dark:from-amber-300 dark:via-yellow-400 dark:to-amber-600",
      pointTextClass:
        "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 bg-clip-text text-transparent dark:from-amber-300 dark:via-yellow-200 dark:to-amber-400",
    };
  }
  return {
    name: "diamond",
    label: "DIAMOND",
    wrapper:
      "tier-shimmer rounded-xl bg-[linear-gradient(110deg,#a5f3fc,#c7d2fe,#fbcfe8,#fde68a,#a5f3fc,#c7d2fe)] p-[2px] shadow-[0_0_22px_-4px_rgba(192,132,252,0.7)]",
    pointTextClass:
      "bg-[linear-gradient(110deg,#06b6d4,#6366f1,#ec4899,#f59e0b,#06b6d4)] bg-[length:200%_100%] tier-shimmer bg-clip-text text-transparent",
  };
}

function ActivityCard({ a }: { a: Activity }) {
  const s = STATUS_LABEL[a.status] ?? { label: a.status, className: "" };
  const tier = getTier(a.points_awarded);

  const inner = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-black dark:text-zinc-50">
          {a.event_name}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.outcome}</p>
        <p className="text-xs text-zinc-400">
          {a.activity_date_start} 〜 {a.activity_date_end}・参加者{" "}
          {a.total_participants} 名
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${s.className}`}
        >
          {s.label}
        </span>
        {a.points_awarded != null && (
          <span
            className={`text-sm font-semibold tabular-nums ${tier?.pointTextClass ?? "text-black dark:text-zinc-50"}`}
          >
            {a.points_awarded} pt
          </span>
        )}
        {tier && (
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {tier.label}
          </span>
        )}
      </div>
    </div>
  );

  if (!tier) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        {inner}
      </div>
    );
  }

  return (
    <div className={tier.wrapper}>
      <div className="rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        {inner}
      </div>
    </div>
  );
}

export default async function ActivitiesPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let myActivities: Activity[] = [];
  let allApproved: Activity[] = [];

  try {
    myActivities = await apiFetch(`/api/activities?discord_id=${discordId}`);
  } catch {
    // バックエンド未起動時は空リスト
  }
  try {
    allApproved = await apiFetch("/api/activities");
  } catch {
    // バックエンド未起動時は空リスト
  }

  // 自分の承認済みを除いた全体リスト
  const myIds = new Set(myActivities.map((a) => a.id));
  const othersApproved = allApproved.filter((a) => !myIds.has(a.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          活動実績
        </h1>
        <Link
          href="/activities/new"
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          + 申請する
        </Link>
      </div>

      {/* 自分の申請 */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          自分の申請
        </h2>
        {myActivities.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            申請はまだありません。「+ 申請する」から活動を報告しましょう。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {myActivities.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>

      {/* 他メンバーの承認済み実績 */}
      {othersApproved.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-black dark:text-zinc-50">
            メンバーの承認済み実績
          </h2>
          <div className="flex flex-col gap-3">
            {othersApproved.map((a) => (
              <ActivityCard key={a.id} a={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
