import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Portfolio } from "@/types/competition";
import PortfolioActions from "./PortfolioActions";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();
  const viewer = session?.user.discordId;

  let portfolio: Portfolio;
  try {
    portfolio = await apiFetch(
      `/api/portfolio/${userId}${viewer ? `?viewer_discord_id=${viewer}` : ""}`,
    );
  } catch (err) {
    // 403 は非公開、404 は存在しない
    if (err instanceof Error && err.message.includes("403")) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-black">
          <div className="flex max-w-md flex-col items-center gap-3 text-center">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              このポートフォリオは非公開です
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              閲覧するにはログインが必要です。
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              ログイン
            </Link>
          </div>
        </main>
      );
    }
    notFound();
  }

  const isOwner = viewer !== undefined && viewer === portfolio.discord_id;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:py-0">
      {/* ヘッダー */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          {portfolio.avatar_url ? (
            <Image
              src={portfolio.avatar_url}
              alt={portfolio.username}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              {portfolio.display_name || portfolio.username}
            </h1>
            <p className="text-sm text-zinc-500">@{portfolio.username}</p>
          </div>
        </div>

        {portfolio.bio && (
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {portfolio.bio}
          </p>
        )}

        {portfolio.business_desc && (
          <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {portfolio.business_desc}
          </p>
        )}

        <dl className="flex flex-wrap gap-6">
          {[
            {
              label: "ポイント",
              value: `${portfolio.total_points}`,
              unit: "pt",
              color: "var(--brand-green)",
            },
            {
              label: "作業時間",
              value: `${portfolio.total_hours}`,
              unit: "h",
              color: "var(--brand-blue)",
            },
            {
              label: "受賞・成果",
              value: `${portfolio.achievement_count}`,
              unit: "件",
              color: "var(--brand-orange)",
            },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {stat.label}
              </dt>
              <dd
                className="text-xl font-semibold tabular-nums"
                style={{ color: stat.color }}
              >
                {stat.value}
                <span className="ml-0.5 text-xs">{stat.unit}</span>
              </dd>
            </div>
          ))}
        </dl>

        {portfolio.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {portfolio.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border px-2.5 py-0.5 text-xs"
                style={{
                  borderColor: "var(--brand-blue)",
                  color: "var(--brand-blue)",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {isOwner && (
          <PortfolioActions
            userId={portfolio.user_id}
            isPublic={portfolio.public}
          />
        )}
      </header>

      {/* 時系列 */}
      <section className="flex flex-col gap-6 pt-8">
        {portfolio.items.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            まだ公開できる活動がありません。
          </p>
        ) : (
          portfolio.items.map((item, i) => (
            <article
              key={`${item.date}-${item.title}-${i}`}
              className="relative flex gap-4 border-l-2 pl-5"
              style={{
                borderColor:
                  item.kind === "achievement"
                    ? "var(--brand-green)"
                    : "var(--brand-orange)",
              }}
            >
              <span
                className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    item.kind === "achievement"
                      ? "var(--brand-green)"
                      : "var(--brand-orange)",
                }}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[11px] tabular-nums text-zinc-400">
                  {item.date}
                  {item.kind === "achievement" && " · 受賞"}
                  {item.points !== null && ` · ${item.points}pt`}
                </span>
                <h2 className="font-medium text-black dark:text-zinc-50">
                  {item.kind === "achievement" && "🏆 "}
                  {item.title}
                </h2>
                {item.body && (
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {item.body}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs hover:underline"
                    style={{ color: "var(--brand-blue)" }}
                  >
                    {item.url}
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
