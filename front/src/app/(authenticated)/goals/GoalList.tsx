"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createGoal,
  deleteGoal,
  setGoalStatus,
  updateGoal,
} from "@/actions/goal";
import { createTodo, toggleTodo } from "@/actions/todo";
import BigCheck from "@/app/components/BigCheck";
import { hapticCancel, hapticSuccess } from "@/lib/haptics";
import { type Goal, URGENT_DAYS } from "@/types/goal";
import { priorityOf, type Todo } from "@/types/todo";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/** 期限の残り日数を人が読める形にする */
function deadlineText(goal: Goal): string {
  if (!goal.target_date) return "期限なし";
  const date = goal.target_date.replaceAll("-", "/").slice(5);
  const left = goal.days_left;
  if (left === null) return date;
  if (left < 0) return `${date}（${-left}日超過）`;
  if (left === 0) return `${date}（今日まで）`;
  return `${date}（あと${left}日）`;
}

/** 期限の色。超過は赤、間近はオレンジ、それ以外は控えめ */
function deadlineColor(goal: Goal): string | undefined {
  if (goal.status !== "active" || goal.days_left === null) return undefined;
  if (goal.days_left < 0) return "#dc2626";
  if (goal.days_left <= URGENT_DAYS) return "var(--brand-orange)";
  return undefined;
}

/** 進行中を上、達成・取り下げを下に。サーバーと同じ並びを保つ */
function sortGoals(items: Goal[]): Goal[] {
  return [...items].sort((a, b) => {
    const aActive = a.status === "active";
    const bActive = b.status === "active";
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aDate = a.target_date ?? "9999-99-99";
    const bDate = b.target_date ?? "9999-99-99";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return b.created_at.localeCompare(a.created_at);
  });
}

export default function GoalList({
  goals,
  todos,
}: {
  goals: Goal[];
  todos: Todo[];
}) {
  // 操作結果で即座に画面を更新する（サーバーの再取得を待たない）
  const [items, setItems] = useState(() => sortGoals(goals));
  // 目標に紐づく TODO もこのページで直接チェック・追加できるようにする
  const [todoItems, setTodoItems] = useState(todos);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(sortGoals(goals));
  }, [goals]);

  useEffect(() => {
    setTodoItems(todos);
  }, [todos]);

  /** 目標に紐づく TODO。未完了を先、その中は優先度の高い順 */
  const todosOf = (goalId: string) =>
    todoItems
      .filter((t) => t.goal_id === goalId)
      .sort((a, b) => {
        if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
        return b.priority - a.priority;
      });

  /** 紐づく TODO のチェックを切り替える（楽観更新） */
  const toggleLinkedTodo = (todo: Todo) => {
    const next = !todo.is_done;
    setTodoItems((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_done: next } : t)),
    );
    if (next) hapticSuccess();
    startTransition(async () => {
      const res = await toggleTodo(todo.id, next);
      if (res.todo) {
        const saved = res.todo;
        setTodoItems((prev) =>
          prev.map((t) => (t.id === saved.id ? saved : t)),
        );
      } else {
        setTodoItems((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
        hapticCancel();
        setMessage({ ok: false, text: res.message });
      }
    });
  };

  /** 目標に紐づく TODO を追加する */
  const addLinkedTodo = (goalId: string, title: string) => {
    startTransition(async () => {
      const res = await createTodo(title, null, 1, goalId);
      if (res.todo) {
        const created = res.todo;
        setTodoItems((prev) => [created, ...prev]);
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const replace = (goal: Goal) =>
    setItems((prev) =>
      sortGoals(prev.map((g) => (g.id === goal.id ? goal : g))),
    );

  /**
   * 達成・未達成を切り替える。
   * 通信を待つと反応が鈍く感じるので、先に画面を切り替えて失敗時に戻す。
   */
  const doToggle = (goal: Goal) => {
    const next = goal.status === "achieved" ? "active" : "achieved";
    replace({
      ...goal,
      status: next,
      achieved_at: next === "achieved" ? new Date().toISOString() : null,
    });
    if (next === "achieved") hapticSuccess();

    startTransition(async () => {
      const res = await setGoalStatus(goal.id, next);
      if (res.goal) {
        replace(res.goal);
      } else {
        replace(goal);
        hapticCancel();
        setFailedId(goal.id);
        setTimeout(() => setFailedId(null), 400);
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDetail(goal.detail ?? "");
    setEditDeadline(goal.target_date ?? "");
  };

  const saveEdit = (goalId: string) => {
    setPendingId(goalId);
    startTransition(async () => {
      const res = await updateGoal(goalId, editTitle, editDetail, editDeadline);
      if (res.goal) {
        replace(res.goal);
        setEditingId(null);
      }
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const doDelete = (goal: Goal) => {
    if (!window.confirm(`「${goal.title}」を削除しますか？`)) return;
    setPendingId(goal.id);
    startTransition(async () => {
      const res = await deleteGoal(goal.id);
      if (res.ok) {
        setItems((prev) => prev.filter((g) => g.id !== goal.id));
        setEditingId(null);
      }
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const doDrop = (goal: Goal) => {
    setPendingId(goal.id);
    startTransition(async () => {
      const res = await setGoalStatus(
        goal.id,
        goal.status === "dropped" ? "active" : "dropped",
      );
      if (res.goal) replace(res.goal);
      setMessage({ ok: res.ok, text: res.message });
      setPendingId(null);
    });
  };

  const doCreate = () => {
    startTransition(async () => {
      const res = await createGoal(newTitle, newDetail, newDeadline);
      if (res.goal) {
        setItems((prev) => sortGoals([res.goal as Goal, ...prev]));
        setNewTitle("");
        setNewDetail("");
        setNewDeadline("");
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const active = items.filter((g) => g.status === "active");
  const achieved = items.filter((g) => g.status === "achieved");
  const dropped = items.filter((g) => g.status === "dropped");

  const rowProps = (goal: Goal) => ({
    goal,
    pending: pendingId === goal.id,
    failed: failedId === goal.id,
    editing: editingId === goal.id,
    editTitle,
    editDetail,
    editDeadline,
    onEditTitle: setEditTitle,
    onEditDetail: setEditDetail,
    onEditDeadline: setEditDeadline,
    onToggle: () => doToggle(goal),
    onStartEdit: () => startEdit(goal),
    onCancelEdit: () => setEditingId(null),
    onSave: () => saveEdit(goal.id),
    onDelete: () => doDelete(goal),
    onDrop: () => doDrop(goal),
    todos: todosOf(goal.id),
    onToggleTodo: toggleLinkedTodo,
    onAddTodo: (title: string) => addLinkedTodo(goal.id, title),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* --- 追加 --- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          目標を立てる
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
            placeholder="達成したいこと（例: 月商100万円）"
            className={inputClass}
          />
          <textarea
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="達成の基準・そのために何をするか（任意）"
            className={inputClass}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              期限（任意）
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <button
              type="button"
              onClick={doCreate}
              disabled={!newTitle.trim()}
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              目標を立てる
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

      {/* --- 進行中 --- */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            進行中
          </h2>
          <span className="font-mono tabular-nums text-zinc-400">
            <span
              className="text-2xl font-semibold"
              style={{
                color: achieved.length > 0 ? "var(--brand-green)" : undefined,
              }}
            >
              {achieved.length}
            </span>
            <span className="text-sm"> 件達成</span>
          </span>
        </div>

        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700">
            進行中の目標はありません。まずは一つ立ててみましょう 🎯
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((goal) => (
              <GoalRow key={goal.id} {...rowProps(goal)} />
            ))}
          </ul>
        )}
      </section>

      {/* --- 達成 --- */}
      {achieved.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            達成した目標（{achieved.length}件）
          </h2>
          <ul className="flex flex-col gap-2">
            {achieved.map((goal) => (
              <GoalRow key={goal.id} {...rowProps(goal)} />
            ))}
          </ul>
        </section>
      )}

      {/* --- 取り下げ --- */}
      {dropped.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            取り下げた目標（{dropped.length}件）
          </h2>
          <ul className="flex flex-col gap-2">
            {dropped.map((goal) => (
              <GoalRow key={goal.id} {...rowProps(goal)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type RowProps = {
  goal: Goal;
  pending: boolean;
  failed: boolean;
  editing: boolean;
  editTitle: string;
  editDetail: string;
  editDeadline: string;
  onEditTitle: (v: string) => void;
  onEditDetail: (v: string) => void;
  onEditDeadline: (v: string) => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDrop: () => void;
  todos: Todo[];
  onToggleTodo: (todo: Todo) => void;
  onAddTodo: (title: string) => void;
};

function GoalRow({
  goal,
  pending,
  failed,
  editing,
  editTitle,
  editDetail,
  editDeadline,
  onEditTitle,
  onEditDetail,
  onEditDeadline,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onDrop,
  todos,
  onToggleTodo,
  onAddTodo,
}: RowProps) {
  const achieved = goal.status === "achieved";
  const isDropped = goal.status === "dropped";

  return (
    <li
      className={`rounded-xl border p-3.5 transition-all duration-200 sm:p-4 ${
        failed ? "shake-x" : ""
      }`}
      style={{
        borderColor: achieved
          ? "var(--brand-green)"
          : "color-mix(in srgb, currentColor 12%, transparent)",
        backgroundColor: achieved
          ? "color-mix(in srgb, var(--brand-green) 8%, transparent)"
          : undefined,
        opacity: isDropped ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-4">
        {/* 大きなチェック。押すと達成・進行中が切り替わる */}
        <button
          type="button"
          onClick={onToggle}
          disabled={pending || isDropped}
          aria-pressed={achieved}
          aria-label={achieved ? "進行中に戻す" : "達成にする"}
          className="shrink-0 rounded-full transition-transform enabled:active:scale-95 disabled:cursor-not-allowed"
        >
          <BigCheck done={achieved} pending={pending} />
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
            <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              期限
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => onEditDeadline(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950"
              />
              {editDeadline && (
                <button
                  type="button"
                  onClick={() => onEditDeadline("")}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  期限を外す
                </button>
              )}
            </label>
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
                onClick={onDrop}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {isDropped ? "進行中に戻す" : "取り下げる"}
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
                  achieved
                    ? "text-zinc-400 line-through decoration-[1.5px]"
                    : "text-zinc-800 dark:text-zinc-100"
                }`}
              >
                {goal.title}
              </span>
              {goal.detail && (
                <span
                  className={`mt-1 block whitespace-pre-wrap text-xs ${
                    achieved
                      ? "text-zinc-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {goal.detail}
                </span>
              )}
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-zinc-400">
                <span style={{ color: deadlineColor(goal) }}>
                  {deadlineText(goal)}
                </span>
                {todos.length > 0 && (
                  <span>
                    TODO {todos.filter((t) => t.is_done).length}/{todos.length}
                  </span>
                )}
                {isDropped && <span>取り下げ中</span>}
              </span>
            </button>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              {goal.source === "discord" && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Discord
                </span>
              )}
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                aria-label={`「${goal.title}」を削除`}
                title="削除"
                className="rounded-lg p-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-[var(--brand-orange)] disabled:opacity-40 dark:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[18px] w-[18px]"
                >
                  <path d="M4 7h16" />
                  <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
                  <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </span>
          </>
        )}
      </div>

      {/* 紐づく TODO。この目標の進捗そのもの */}
      {!editing && (
        <LinkedTodos
          todos={todos}
          achieved={achieved}
          onToggle={onToggleTodo}
          onAdd={onAddTodo}
        />
      )}
    </li>
  );
}

/** 目標に紐づく TODO の一覧と、その場での追加フォーム */
function LinkedTodos({
  todos,
  achieved,
  onToggle,
  onAdd,
}: {
  todos: Todo[];
  achieved: boolean;
  onToggle: (todo: Todo) => void;
  onAdd: (title: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const done = todos.filter((t) => t.is_done).length;
  const percent =
    todos.length === 0 ? 0 : Math.round((done / todos.length) * 100);

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title);
    setTitle("");
  };

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/70">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          この目標の TODO
          {todos.length > 0 && (
            <span className="ml-1.5 font-mono tabular-nums">
              {done}/{todos.length}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-xs transition-colors hover:opacity-80"
          style={{ color: "var(--brand-green)" }}
        >
          {adding ? "閉じる" : "+ TODO を追加"}
        </button>
      </div>

      {/* 進捗バー */}
      {todos.length > 0 && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              background:
                "linear-gradient(90deg, var(--brand-yellow), var(--brand-green))",
            }}
          />
        </div>
      )}

      {adding && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            maxLength={200}
            placeholder="この目標のためにやること"
            className={inputClass}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim()}
            className="shrink-0 rounded-full px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            追加
          </button>
        </div>
      )}

      {todos.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">
          まだありません。TODO を紐づけると進捗が出ます。
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {todos.map((todo) => {
            const p = priorityOf(todo.priority);
            return (
              <li key={todo.id}>
                <button
                  type="button"
                  onClick={() => onToggle(todo)}
                  disabled={achieved}
                  className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors enabled:hover:bg-zinc-50 disabled:cursor-not-allowed dark:enabled:hover:bg-zinc-800/40"
                >
                  {/* 小さめのチェック。押した瞬間に塗られる */}
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all duration-200"
                    style={{
                      borderColor: todo.is_done
                        ? "var(--brand-green)"
                        : "color-mix(in srgb, currentColor 20%, transparent)",
                      backgroundColor: todo.is_done
                        ? "var(--brand-green)"
                        : "transparent",
                    }}
                  >
                    {todo.is_done && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      todo.is_done
                        ? "text-zinc-400 line-through"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {todo.title}
                  </span>
                  {!todo.is_done && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.label}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
