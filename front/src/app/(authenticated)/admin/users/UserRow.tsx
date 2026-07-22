"use client";

import { useActionState } from "react";
import {
  type ActionResult,
  deleteUser,
  restoreUser,
  setPortfolioVisibility,
  setRole,
} from "@/actions/admin";
import type { AdminUser } from "@/types/admin";

function SubmitButton({
  children,
  color,
  confirm,
  pending,
}: {
  children: React.ReactNode;
  color: string;
  confirm?: string;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="rounded-full border px-2.5 py-1 text-[11px] transition-opacity hover:opacity-70 disabled:opacity-40"
      style={{ borderColor: color, color }}
    >
      {children}
    </button>
  );
}

export default function UserRow({
  user,
  isMaster,
}: {
  user: AdminUser;
  isMaster: boolean;
}) {
  const [delState, delAction, delPending] = useActionState<
    ActionResult | null,
    FormData
  >(deleteUser, null);
  const [resState, resAction, resPending] = useActionState<
    ActionResult | null,
    FormData
  >(restoreUser, null);
  const [visState, visAction, visPending] = useActionState<
    ActionResult | null,
    FormData
  >(setPortfolioVisibility, null);
  const [roleState, roleAction, rolePending] = useActionState<
    ActionResult | null,
    FormData
  >(setRole, null);

  const deleted = user.deleted_at !== null;
  const message = delState ?? resState ?? visState ?? roleState ?? null;

  const roleColor =
    user.role === "master"
      ? "var(--brand-orange)"
      : user.role === "admin"
        ? "var(--brand-blue)"
        : "#a1a1aa";

  return (
    <li
      className={`flex flex-col gap-2 border-t border-zinc-100 py-3 first:border-t-0 dark:border-zinc-800/70 ${
        deleted ? "opacity-55" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-black dark:text-zinc-50">
          {user.display_name || user.username}
        </span>
        <span className="text-xs text-zinc-500">@{user.username}</span>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ borderColor: roleColor, color: roleColor }}
        >
          {user.role}
        </span>
        {deleted && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: "var(--brand-orange)" }}
          >
            削除済み
          </span>
        )}
        <span className="ml-auto font-mono text-xs tabular-nums text-zinc-500">
          {user.total_points}pt · {user.total_hours}h
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* ポートフォリオ公開設定 */}
        <form action={visAction}>
          <input type="hidden" name="user_id" value={user.id} />
          <input
            type="hidden"
            name="public"
            value={(!user.portfolio_public).toString()}
          />
          <SubmitButton color="var(--brand-green)" pending={visPending}>
            ポートフォリオを{user.portfolio_public ? "非公開に" : "公開に"}
          </SubmitButton>
        </form>

        {/* 削除・復元 */}
        {deleted ? (
          <form action={resAction}>
            <input type="hidden" name="user_id" value={user.id} />
            <SubmitButton color="var(--brand-blue)" pending={resPending}>
              復元する
            </SubmitButton>
          </form>
        ) : (
          <form action={delAction}>
            <input type="hidden" name="user_id" value={user.id} />
            <SubmitButton
              color="var(--brand-orange)"
              pending={delPending}
              confirm={`${user.display_name || user.username} を削除します。ポイント履歴は残り、後から復元できます。よろしいですか？`}
            >
              削除する
            </SubmitButton>
          </form>
        )}

        {/* 権限付与は master のみ */}
        {isMaster && user.role !== "master" && (
          <form action={roleAction}>
            <input type="hidden" name="user_id" value={user.id} />
            <input
              type="hidden"
              name="role"
              value={user.role === "admin" ? "member" : "admin"}
            />
            <SubmitButton
              color="var(--brand-blue)"
              pending={rolePending}
              confirm={
                user.role === "admin"
                  ? `${user.username} の管理者権限を剥奪しますか？`
                  : `${user.username} に管理者権限を付与しますか？`
              }
            >
              {user.role === "admin" ? "管理者を解除" : "管理者にする"}
            </SubmitButton>
          </form>
        )}
      </div>

      {message && (
        <p
          className="text-xs"
          style={{
            color: message.ok ? "var(--brand-green)" : "var(--brand-orange)",
          }}
        >
          {message.message}
        </p>
      )}
    </li>
  );
}
