"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { Todo } from "@/types/todo";

/** 操作者は必ずセッション由来の discord_id を使う（なりすまし防止） */
async function actorId() {
  const session = await auth();
  if (!session?.user.discordId) throw new Error("Not authenticated");
  return session.user.discordId;
}

function detailOf(err: unknown): string {
  const raw = err instanceof Error ? err.message : "不明なエラー";
  return raw.match(/"detail":"([^"]+)"/)?.[1] ?? raw;
}

export type TodoState = {
  ok: boolean;
  message: string;
  /** 更新後の TODO。削除時は undefined */
  todo?: Todo;
};

async function run(
  fn: (discordId: string) => Promise<Todo | null>,
  successMessage: string,
): Promise<TodoState> {
  let discordId: string;
  try {
    discordId = await actorId();
  } catch {
    return { ok: false, message: "ログインが必要です" };
  }

  try {
    const todo = await fn(discordId);
    revalidatePath("/todos");
    return { ok: true, message: successMessage, todo: todo ?? undefined };
  } catch (err) {
    return { ok: false, message: detailOf(err) };
  }
}

/** TODO を作成する（詳細は任意） */
export async function createTodo(
  title: string,
  detail: string | null,
  priority: number,
  goalId: string | null,
): Promise<TodoState> {
  if (!title.trim()) {
    return { ok: false, message: "タイトルを入力してください" };
  }
  return run(
    (discordId) =>
      apiFetch(`/api/todos?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          detail: detail?.trim() || null,
          priority,
        }),
      }),
    "TODO を追加しました",
  );
}

/** タイトル・詳細・優先度・紐づけ先を更新する。空文字にすると消える */
export async function updateTodo(
  todoId: string,
  title: string,
  detail: string,
  priority: number,
  /** 空文字を渡すと紐づけが外れる */
  goalId: string,
): Promise<TodoState> {
  if (!title.trim()) {
    return { ok: false, message: "タイトルを入力してください" };
  }
  return run(
    (discordId) =>
      apiFetch(`/api/todos/${todoId}?discord_id=${discordId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, detail, priority, goal_id: goalId }),
      }),
    "保存しました",
  );
}

/** 完了・未完了を切り替える */
export async function toggleTodo(
  todoId: string,
  done: boolean,
): Promise<TodoState> {
  return run(
    (discordId) =>
      apiFetch(`/api/todos/${todoId}/toggle?discord_id=${discordId}`, {
        method: "POST",
        body: JSON.stringify({ done }),
      }),
    done ? "完了にしました" : "未完了に戻しました",
  );
}

export async function deleteTodo(todoId: string): Promise<TodoState> {
  return run(
    (discordId) =>
      apiFetch(`/api/todos/${todoId}?discord_id=${discordId}`, {
        method: "DELETE",
      }),
    "削除しました",
  );
}
