import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { ACTION_LABELS, type AuditLog } from "@/types/admin";

const ACTION_COLOR: Record<string, string> = {
  delete_user: "var(--brand-orange)",
  delete_event: "var(--brand-orange)",
  set_role: "var(--brand-blue)",
  grant_points: "var(--brand-green)",
};

export default async function AdminLogsPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let logs: AuditLog[] = [];
  let error: string | null = null;
  try {
    logs = await apiFetch(
      `/api/admin/audit-logs?discord_id=${discordId}&limit=200`,
    );
  } catch {
    error = "監査ログを取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-4">
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

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          管理操作の履歴
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          誰がいつ何をしたかの記録です。削除はできません。
        </p>

        {logs.length === 0 ? (
          <p className="text-sm text-zinc-400">操作履歴はまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium text-zinc-500">日時</th>
                  <th className="py-2 pr-3 font-medium text-zinc-500">
                    操作者
                  </th>
                  <th className="py-2 pr-3 font-medium text-zinc-500">操作</th>
                  <th className="py-2 font-medium text-zinc-500">詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/70"
                  >
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-[11px] tabular-nums text-zinc-400">
                      {new Date(log.created_at).toLocaleString("ja-JP", {
                        year: "2-digit",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-[11px] text-zinc-500">
                        {log.actor_discord_id}
                      </span>
                      <span className="ml-1.5 text-[10px] text-zinc-400">
                        ({log.actor_role})
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px]"
                        style={{
                          borderColor: ACTION_COLOR[log.action] ?? "#a1a1aa",
                          color: ACTION_COLOR[log.action] ?? "#a1a1aa",
                        }}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-600 dark:text-zinc-400">
                      {log.detail ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
