import { auth } from "@/auth";
import { getAdminMe } from "@/lib/admin";
import { apiFetch } from "@/lib/api";
import type { AdminUser } from "@/types/admin";
import UserRow from "./UserRow";

export default async function AdminUsersPage() {
  const session = await auth();
  const discordId = session!.user.discordId;
  const me = await getAdminMe();

  let users: AdminUser[] = [];
  let error: string | null = null;
  try {
    users = await apiFetch(`/api/admin/users?discord_id=${discordId}`);
  } catch {
    error = "ユーザー一覧を取得できませんでした。";
  }

  const active = users.filter((u) => u.deleted_at === null);
  const deleted = users.filter((u) => u.deleted_at !== null);

  return (
    <div className="flex flex-col gap-6">
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

      {!me.is_master && (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          管理者権限の付与・剥奪は master のみが実行できます。
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          在籍メンバー（{active.length}名）
        </h2>
        <ul className="flex flex-col">
          {active.map((u) => (
            <UserRow key={u.id} user={u} isMaster={me.is_master} />
          ))}
        </ul>
      </section>

      {deleted.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            削除済み（{deleted.length}名）
          </h2>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            一覧・ランキング・ポートフォリオから除外されています。ポイント履歴は保持されており、復元できます。
          </p>
          <ul className="flex flex-col">
            {deleted.map((u) => (
              <UserRow key={u.id} user={u} isMaster={me.is_master} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
