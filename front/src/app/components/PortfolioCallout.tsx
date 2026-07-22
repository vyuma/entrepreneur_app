import Link from "next/link";

/**
 * ポートフォリオへの導線。
 * 埋もれないよう、ホームとプロフィールの両方の目立つ位置に置く。
 */
export default function PortfolioCallout({
  userId,
  isPublic,
  achievementCount,
  totalHours,
}: {
  userId: string | null;
  isPublic: boolean;
  achievementCount?: number;
  totalHours?: number;
}) {
  if (!userId) return null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-[var(--brand-green)]/50 via-zinc-300 to-[var(--brand-orange)]/50 p-px dark:from-[var(--brand-green)]/35 dark:via-zinc-700 dark:to-[var(--brand-orange)]/35">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
              あなたのポートフォリオ
            </h2>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{
                backgroundColor: isPublic
                  ? "var(--brand-green)"
                  : "var(--brand-blue)",
              }}
            >
              {isPublic ? "公開中" : "非公開"}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            活動実績・受賞・作業時間から自動生成されます。
            {isPublic
              ? "リンクを共有すれば誰でも閲覧できます。"
              : "現在は自分とメンバーだけが閲覧できます。"}
          </p>

          {(achievementCount !== undefined || totalHours !== undefined) && (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-400">
              {achievementCount !== undefined && `受賞 ${achievementCount}件`}
              {achievementCount !== undefined &&
                totalHours !== undefined &&
                " · "}
              {totalHours !== undefined && `作業 ${totalHours}時間`}
            </p>
          )}
        </div>

        <Link
          href={`/portfolio/${userId}`}
          className="shrink-0 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          ポートフォリオを見る →
        </Link>
      </div>
    </div>
  );
}
