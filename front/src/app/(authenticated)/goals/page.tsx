import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Goal } from "@/types/goal";
import type { Todo } from "@/types/todo";
import GoalList from "./GoalList";

export const metadata = { title: "目標 | NueStar" };

export default async function GoalsPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let goals: Goal[] = [];
  // 目標ごとに紐づく TODO を出すため、TODO も一緒に取る
  let todos: Todo[] = [];
  let error: string | null = null;
  try {
    [goals, todos] = await Promise.all([
      apiFetch(`/api/goals?discord_id=${discordId}`),
      apiFetch(`/api/todos?discord_id=${discordId}`),
    ]);
  } catch {
    error = "目標を取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Goal
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-black dark:text-zinc-50">
          目標
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Discord で{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            /goal 目標
          </code>{" "}
          と入力しても立てられます。目標ごとに TODO
          を紐づけて進捗をまとめて管理できます。
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

      <GoalList goals={goals} todos={todos} />
    </div>
  );
}
