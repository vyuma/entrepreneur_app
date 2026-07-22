import Link from "next/link";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { formatFetchedAt } from "@/lib/competition-format";
import {
  COMPETITION_TYPES,
  type CompetitionList,
  type CompetitionSearch,
  type Entry,
  type InternalEvent,
} from "@/types/competition";
import CompetitionCalendar from "./CompetitionCalendar";
import CompetitionCard from "./CompetitionCard";

type Tab = "list" | "calendar" | "recommend";

const TABS: { value: Tab; label: string }[] = [
  { value: "list", label: "一覧" },
  { value: "calendar", label: "カレンダー" },
  { value: "recommend", label: "AI推薦" },
];

function tabClass(active: boolean) {
  return active
    ? "rounded-full px-4 py-1.5 text-sm font-medium text-white"
    : "rounded-full border border-zinc-300 px-4 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
}

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; q?: string }>;
}) {
  const { tab = "list", type, q } = await searchParams;
  const activeTab = (TABS.find((t) => t.value === tab)?.value ?? "list") as Tab;

  const session = await auth();
  const discordId = session!.user.discordId;

  let list: CompetitionList = { fetched_at: "", count: 0, items: [] };
  let internalEvents: InternalEvent[] = [];
  let entries: Entry[] = [];
  let search: CompetitionSearch | null = null;
  let error: string | null = null;

  try {
    const typeParam = type ? `&type=${encodeURIComponent(type)}` : "";
    [list, internalEvents, entries] = await Promise.all([
      apiFetch(`/api/competitions?upcoming=true&sort=deadline${typeParam}`),
      apiFetch("/api/competitions/internal-events"),
      apiFetch(`/api/competitions/entries?discord_id=${discordId}&mine=true`),
    ]);
  } catch {
    error =
      "コンペ情報を取得できませんでした。時間をおいて再読み込みしてください。";
  }

  if (activeTab === "recommend") {
    try {
      search = q
        ? await apiFetch(
            `/api/competitions/search?q=${encodeURIComponent(q)}&limit=30`,
          )
        : await apiFetch(
            `/api/competitions/recommended?discord_id=${discordId}&limit=12`,
          );
    } catch {
      error = "推薦の取得に失敗しました。";
    }
  }

  const enteredUrls = new Set(entries.map((e) => e.url));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          コンペ・イベント
        </h1>
        {list.fetched_at && (
          <span className="font-mono text-[11px] text-zinc-400">
            最終更新 {formatFetchedAt(list.fetched_at)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/competitions?tab=${t.value}`}
            className={tabClass(activeTab === t.value)}
            style={
              activeTab === t.value
                ? { backgroundColor: "var(--brand-green)" }
                : undefined
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

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

      {activeTab === "list" && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/competitions?tab=list"
              className={tabClass(!type)}
              style={
                !type ? { backgroundColor: "var(--brand-blue)" } : undefined
              }
            >
              すべて
            </Link>
            {COMPETITION_TYPES.map((t) => (
              <Link
                key={t.value}
                href={`/competitions?tab=list&type=${t.value}`}
                className={tabClass(type === t.value)}
                style={
                  type === t.value
                    ? { backgroundColor: "var(--brand-blue)" }
                    : undefined
                }
              >
                {t.label}
              </Link>
            ))}
          </div>

          {list.items.length === 0 && !error ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              該当するコンペはありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {list.items.map((c) => (
                <CompetitionCard
                  key={c.id}
                  competition={c}
                  entered={enteredUrls.has(c.url)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "calendar" && (
        <>
          <CompetitionCalendar
            competitions={list.items}
            internalEvents={internalEvents}
          />
        </>
      )}

      {activeTab === "recommend" && (
        <>
          <form
            action="/competitions"
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="tab" value="recommend" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="例: 書類選考だけのコスパの高いコンペ"
              className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              検索
            </button>
            {q && (
              <Link
                href="/competitions?tab=recommend"
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                あなた向けに戻す
              </Link>
            )}
          </form>

          {search && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  {q ? "検索クエリ" : "あなたの実績から自動生成したクエリ"}
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {search.query}
                </p>
                {search.interpretation && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    解釈: {search.interpretation}
                  </p>
                )}
              </div>

              {search.results.length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400">
                  該当するコンペが見つかりませんでした。
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {search.results.map((c) => (
                    <CompetitionCard
                      key={c.id}
                      competition={c}
                      entered={enteredUrls.has(c.url)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
