import GoalList from "@/app/(authenticated)/goals/GoalList";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Goal } from "@/types/goal";
import type { Todo } from "@/types/todo";
import TodoList from "./TodoList";

export const metadata = { title: "TODO・目標 | NueStar" };

/**
 * 目標と TODO をまとめて扱うページ。
 *
 * 目標カードの中にその目標の TODO が入り、どの目標にも紐づかない TODO は
 * 下のセクションに並ぶ。作成・編集・チェックはすべてこの1ページで完結する。
 */
export default async function TodosPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let todos: Todo[] = [];
  let goals: Goal[] = [];
  let error: string | null = null;
  try {
    [todos, goals] = await Promise.all([
      apiFetch(`/api/todos?discord_id=${discordId}`),
      apiFetch(`/api/goals?discord_id=${discordId}`),
    ]);
  } catch {
    error = "TODO・目標を取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Goal &amp; Todo
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-black dark:text-zinc-50">
          TODO・目標
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Discord の{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            /goal 目標
          </code>{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            /todo やること
          </code>{" "}
          からも追加できます。目標に紐づけた TODO は、その目標の進捗になります。
        </p>
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

      {/* --- 目標（中に紐づく TODO が入る） --- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--brand-blue)" }}
          />
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            目標
          </h2>
        </div>
        <GoalList goals={goals} todos={todos} />
      </section>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

      {/* --- 単発の TODO（どの目標にも紐づかないもの） --- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--brand-green)" }}
          />
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            単発の TODO
          </h2>
        </div>
        <TodoList todos={todos} goals={goals} unlinkedOnly />
      </section>
    </div>
  );
}
