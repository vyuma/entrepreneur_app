import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Todo } from "@/types/todo";
import TodoList from "./TodoList";

export const metadata = { title: "TODO | NueStar" };

export default async function TodosPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let todos: Todo[] = [];
  let error: string | null = null;
  try {
    todos = await apiFetch(`/api/todos?discord_id=${discordId}`);
  } catch {
    error = "TODO を取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Todo
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-black dark:text-zinc-50">
          TODO リスト
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Discord で{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            /todo やること
          </code>{" "}
          と入力しても追加できます。詳細はあとから足せます。
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

      <TodoList todos={todos} />
    </div>
  );
}
