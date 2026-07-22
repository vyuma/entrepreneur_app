import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { AdminPointLog, AdminUser } from "@/types/admin";
import GrantForm from "./GrantForm";

function reasonLabel(reason: string) {
  if (reason.startsWith("manual:")) {
    return { text: reason.slice(7), manual: true };
  }
  if (reason === "activity") return { text: "活動実績", manual: false };
  return { text: reason, manual: false };
}

export default async function AdminPointsPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let users: AdminUser[] = [];
  let history: AdminPointLog[] = [];
  let error: string | null = null;
  try {
    [users, history] = await Promise.all([
      apiFetch(
        `/api/admin/users?discord_id=${discordId}&include_deleted=false`,
      ),
      apiFetch(`/api/admin/points/history?discord_id=${discordId}&limit=100`),
    ]);
  } catch {
    error = "データを取得できませんでした。";
  }

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

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          アントレポイントを付与
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          付与操作はすべて監査ログに記録されます。
        </p>
        <GrantForm users={users} />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          付与履歴（直近100件）
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-zinc-400">履歴はまだありません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium text-zinc-500">日時</th>
                  <th className="py-2 pr-3 font-medium text-zinc-500">
                    メンバー
                  </th>
                  <th className="py-2 pr-3 font-medium text-zinc-500">理由</th>
                  <th className="py-2 text-right font-medium text-zinc-500">
                    ポイント
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => {
                  const reason = reasonLabel(log.reason);
                  return (
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
                      <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-300">
                        {log.display_name || log.username || "（削除済み）"}
                      </td>
                      <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          {reason.manual && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
                              style={{ backgroundColor: "var(--brand-blue)" }}
                            >
                              手動
                            </span>
                          )}
                          {reason.text}
                        </span>
                      </td>
                      <td
                        className="py-2 text-right font-semibold tabular-nums"
                        style={{
                          color:
                            log.points >= 0
                              ? "var(--brand-green)"
                              : "var(--brand-orange)",
                        }}
                      >
                        {log.points > 0 ? "+" : ""}
                        {log.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
