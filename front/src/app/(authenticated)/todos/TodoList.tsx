"use client";

import { useEffect, useState, useTransition } from "react";
import { createTodo, deleteTodo, toggleTodo, updateTodo } from "@/actions/todo";
import BigCheck from "@/app/components/BigCheck";
import type { Todo } from "@/types/todo";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/** 未完了を上、完了済みを下に並べる（サーバーと同じ順序をクライアントでも保つ） */
function sortTodos(items: Todo[]): Todo[] {
  return [...items].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });
}

export default function TodoList({ todos }: { todos: Todo[] }) {
  // 操作結果で即座に画面を更新する（サーバーの再取得を待たない）
  const [items, setItems] = useState(() => sortTodos(todos));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(sortTodos(todos));
  }, [todos]);

  const replace = (todo: Todo) =>
    setItems((prev) =>
      sortTodos(prev.map((t) => (t.id === todo.id ? todo : t))),
    );

  const doToggle = (todo: Todo) => {
    setPendingId(todo.id);
    startTransition(async () => {
      const res = await toggleTodo(todo.id, !todo.is_done);
      if (res.todo) replace(res.todo);
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDetail(todo.detail ?? "");
  };

  const saveEdit = (todoId: string) => {
    setPendingId(todoId);
    startTransition(async () => {
      const res = await updateTodo(todoId, editTitle, editDetail);
      if (res.todo) {
        replace(res.todo);
        setEditingId(null);
      }
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const doDelete = (todo: Todo) => {
    if (!window.confirm(`「${todo.title}」を削除しますか？`)) return;
    setPendingId(todo.id);
    startTransition(async () => {
      const res = await deleteTodo(todo.id);
      if (res.ok) {
        setItems((prev) => prev.filter((t) => t.id !== todo.id));
        setEditingId(null);
      }
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const doCreate = () => {
    startTransition(async () => {
      const res = await createTodo(newTitle, newDetail);
      if (res.todo) {
        setItems((prev) => sortTodos([res.todo as Todo, ...prev]));
        setNewTitle("");
        setNewDetail("");
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const open = items.filter((t) => !t.is_done);
  const done = items.filter((t) => t.is_done);

  return (
    <div className="flex flex-col gap-6">
      {/* --- 追加 --- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          TODO を追加
        </h2>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTitle.trim()) doCreate();
            }}
            maxLength={200}
            placeholder="やること"
            className={inputClass}
          />
          <textarea
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="詳細（任意）"
            className={inputClass}
          />
          <div>
            <button
              type="button"
              onClick={doCreate}
              disabled={!newTitle.trim()}
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              追加する
            </button>
          </div>
        </div>
      </section>

      {message && (
        <p
          className="text-sm"
          style={{
            color: message.ok ? "var(--brand-green)" : "var(--brand-orange)",
          }}
        >
          {message.text}
        </p>
      )}

      {/* --- 未完了 --- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            未完了
          </h2>
          <span className="font-mono tabular-nums text-zinc-400">
            <span
              className="text-2xl font-semibold"
              style={{
                color: done.length > 0 ? "var(--brand-green)" : undefined,
              }}
            >
              {done.length}
            </span>
            <span className="text-sm"> / {items.length} 完了</span>
          </span>
        </div>

        {open.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
            未完了の TODO はありません 🎉
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                pending={pendingId === todo.id}
                editing={editingId === todo.id}
                editTitle={editTitle}
                editDetail={editDetail}
                onEditTitle={setEditTitle}
                onEditDetail={setEditDetail}
                onToggle={() => doToggle(todo)}
                onStartEdit={() => startEdit(todo)}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => saveEdit(todo.id)}
                onDelete={() => doDelete(todo)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* --- 完了済み --- */}
      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            完了済み（{done.length}件）
          </h2>
          <ul className="flex flex-col gap-2">
            {done.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                pending={pendingId === todo.id}
                editing={editingId === todo.id}
                editTitle={editTitle}
                editDetail={editDetail}
                onEditTitle={setEditTitle}
                onEditDetail={setEditDetail}
                onToggle={() => doToggle(todo)}
                onStartEdit={() => startEdit(todo)}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => saveEdit(todo.id)}
                onDelete={() => doDelete(todo)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type RowProps = {
  todo: Todo;
  pending: boolean;
  editing: boolean;
  editTitle: string;
  editDetail: string;
  onEditTitle: (v: string) => void;
  onEditDetail: (v: string) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
};

function TodoRow({
  todo,
  pending,
  editing,
  editTitle,
  editDetail,
  onEditTitle,
  onEditDetail,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: RowProps) {
  return (
    <li
      className="rounded-xl border p-3.5 transition-all duration-200 sm:p-4"
      style={{
        borderColor: todo.is_done
          ? "var(--brand-green)"
          : "color-mix(in srgb, currentColor 12%, transparent)",
        backgroundColor: todo.is_done
          ? "color-mix(in srgb, var(--brand-green) 8%, transparent)"
          : undefined,
      }}
    >
      <div className="flex items-center gap-4">
        {/* 大きなチェック。押すと完了・未完了が切り替わる */}
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          aria-pressed={todo.is_done}
          aria-label={todo.is_done ? "未完了に戻す" : "完了にする"}
          className="shrink-0 rounded-full transition-transform enabled:active:scale-95 disabled:cursor-not-allowed"
        >
          <BigCheck done={todo.is_done} pending={pending} />
        </button>

        {editing ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitle(e.target.value)}
              maxLength={200}
              className={inputClass}
            />
            <textarea
              value={editDetail}
              onChange={(e) => onEditDetail(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="詳細（任意・空にすると消えます）"
              className={inputClass}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={pending || !editTitle.trim()}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "var(--brand-green)" }}
              >
                {pending ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
              >
                削除
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onStartEdit}
              className="min-w-0 flex-1 text-left"
            >
              <span
                className={`block text-[15px] font-medium transition-colors sm:text-base ${
                  todo.is_done
                    ? "text-zinc-400 line-through decoration-[1.5px]"
                    : "text-zinc-800 dark:text-zinc-100"
                }`}
              >
                {todo.title}
              </span>
              {todo.detail && (
                <span
                  className={`mt-1 block whitespace-pre-wrap text-xs ${
                    todo.is_done
                      ? "text-zinc-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {todo.detail}
                </span>
              )}
              {!todo.detail && !todo.is_done && (
                <span className="mt-1 block text-xs text-zinc-400">
                  タップして詳細を追加
                </span>
              )}
            </button>
            {todo.source === "discord" && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                Discord
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
