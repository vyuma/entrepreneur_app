"use client";

import { useActionState } from "react";
import { type ActionResult, grantPoints } from "@/actions/admin";
import type { AdminUser } from "@/types/admin";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

export default function GrantForm({ users }: { users: AdminUser[] }) {
  const [state, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(grantPoints, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          メンバー
          <select name="user_id" required className={inputClass}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.username}（{u.total_points}pt）
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          ポイント（マイナスで減算）
          <input
            type="number"
            name="points"
            required
            step={1}
            placeholder="例: 50"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          理由
          <input
            type="text"
            name="reason"
            required
            maxLength={200}
            placeholder="例: イベント運営"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || users.length === 0}
          className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "var(--brand-green)" }}
        >
          {pending ? "付与中..." : "付与する"}
        </button>

        {state && (
          <p
            className="text-sm"
            style={{
              color: state.ok ? "var(--brand-green)" : "var(--brand-orange)",
            }}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
