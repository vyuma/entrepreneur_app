"use client";

import { useEffect, useState, useTransition } from "react";
import { createTodo, deleteTodo, toggleTodo, updateTodo } from "@/actions/todo";
import BigCheck from "@/app/components/BigCheck";
import { hapticCancel, hapticSuccess } from "@/lib/haptics";
import {
  PRIORITIES,
  PRIORITY_NORMAL,
  priorityOf,
  type Todo,
} from "@/types/todo";

/** 高・中・低を選ぶセグメント */
function PrioritySelect({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <fieldset
      aria-label="優先度"
      className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700"
    >
      {PRIORITIES.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            aria-pressed={active}
            className={`${
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
            } font-medium transition-colors ${
              active
                ? "text-white"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
            style={{ backgroundColor: active ? p.color : undefined }}
          >
            {p.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/** 行に出す優先度のバッジ */
function PriorityBadge({ priority }: { priority: number }) {
  const p = priorityOf(priority);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: p.color }}
      title={`優先度: ${p.label}`}
    >
      {p.label}
    </span>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/** UTC で保存された日時を日本時間の "7/30 20:45" 形式にする */
function formatStamp(iso: string): string {
  // バックエンドは naive な UTC を返すので、Z が無ければ補って解釈する
  const normalized = /[Z+]|\d-\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d);
}

/** 経過日数から「今日 / 昨日 / n日前」を作る */
function relativeDays(iso: string): string {
  const normalized = /[Z+]|\d-\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
  const then = new Date(normalized).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  return `${days}日前`;
}

/** 未完了→優先度の高い順→新しい順。サーバーと同じ並びをクライアントでも保つ */
function sortTodos(items: Todo[]): Todo[] {
  return [...items].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (a.priority !== b.priority) return b.priority - a.priority;
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
  // 保存に失敗した行を短く揺らして知らせる
  const [failedId, setFailedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editPriority, setEditPriority] = useState<number>(PRIORITY_NORMAL);
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newPriority, setNewPriority] = useState<number>(PRIORITY_NORMAL);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(sortTodos(todos));
  }, [todos]);

  const replace = (todo: Todo) =>
    setItems((prev) =>
      sortTodos(prev.map((t) => (t.id === todo.id ? todo : t))),
    );

  /**
   * 完了・未完了を切り替える。
   * 通信の往復を待つと反応が 100ms を超えて「重い」と感じるため、
   * 先に画面を切り替えてから保存し、失敗したときだけ元に戻す。
   */
  const doToggle = (todo: Todo) => {
    const next = !todo.is_done;
    replace({
      ...todo,
      is_done: next,
      done_at: next ? new Date().toISOString() : null,
    });
    if (next) hapticSuccess();

    startTransition(async () => {
      const res = await toggleTodo(todo.id, next);
      if (res.todo) {
        replace(res.todo);
      } else {
        // 保存できなかったので元の状態に戻す
        replace(todo);
        hapticCancel();
        setFailedId(todo.id);
        setTimeout(() => setFailedId(null), 400);
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDetail(todo.detail ?? "");
    setEditPriority(todo.priority);
  };

  const saveEdit = (todoId: string) => {
    setPendingId(todoId);
    startTransition(async () => {
      const res = await updateTodo(todoId, editTitle, editDetail, editPriority);
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
      const res = await createTodo(newTitle, newDetail, newPriority);
      if (res.todo) {
        setItems((prev) => sortTodos([res.todo as Todo, ...prev]));
        setNewTitle("");
        setNewDetail("");
        setNewPriority(PRIORITY_NORMAL);
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
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              優先度
              <PrioritySelect value={newPriority} onChange={setNewPriority} />
            </span>
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
                failed={failedId === todo.id}
                editing={editingId === todo.id}
                editTitle={editTitle}
                editDetail={editDetail}
                editPriority={editPriority}
                onEditTitle={setEditTitle}
                onEditDetail={setEditDetail}
                onEditPriority={setEditPriority}
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
                failed={failedId === todo.id}
                editing={editingId === todo.id}
                editTitle={editTitle}
                editDetail={editDetail}
                editPriority={editPriority}
                onEditTitle={setEditTitle}
                onEditDetail={setEditDetail}
                onEditPriority={setEditPriority}
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
  failed: boolean;
  editing: boolean;
  editTitle: string;
  editDetail: string;
  editPriority: number;
  onEditTitle: (v: string) => void;
  onEditDetail: (v: string) => void;
  onEditPriority: (v: number) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
};

function TodoRow({
  todo,
  pending,
  failed,
  editing,
  editTitle,
  editDetail,
  editPriority,
  onEditTitle,
  onEditDetail,
  onEditPriority,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: RowProps) {
  return (
    <li
      className={`rounded-xl border p-3.5 transition-all duration-200 sm:p-4 ${
        failed ? "shake-x" : ""
      }`}
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
            <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              優先度
              <PrioritySelect
                value={editPriority}
                onChange={onEditPriority}
                size="sm"
              />
            </span>
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
              <span className="flex flex-wrap items-center gap-2">
                {!todo.is_done && <PriorityBadge priority={todo.priority} />}
                <span
                  className={`text-[15px] font-medium transition-colors sm:text-base ${
                    todo.is_done
                      ? "text-zinc-400 line-through decoration-[1.5px]"
                      : "text-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {todo.title}
                </span>
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
              {/* 作成日時と、完了していれば完了日時 */}
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-zinc-400">
                <span title={`作成: ${formatStamp(todo.created_at)}`}>
                  作成 {formatStamp(todo.created_at)}（
                  {relativeDays(todo.created_at)}）
                </span>
                {todo.is_done && todo.done_at && (
                  <span style={{ color: "var(--brand-green)" }}>
                    完了 {formatStamp(todo.done_at)}
                  </span>
                )}
              </span>
            </button>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {todo.source === "discord" && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Discord
                </span>
              )}
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                aria-label={`「${todo.title}」を削除`}
                title="削除"
                className="rounded-lg p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-[var(--brand-orange)] disabled:opacity-40 dark:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <TrashIcon className="h-[18px] w-[18px]" />
              </button>
            </span>
          </>
        )}
      </div>
    </li>
  );
}
