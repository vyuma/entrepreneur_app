import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import type { AdminMe } from "@/types/admin";

const GUEST: AdminMe = {
  discord_id: "",
  role: "member",
  is_admin: false,
  is_master: false,
};

/**
 * ログイン中ユーザーの権限を取得する。
 * バックエンドが落ちている場合も権限なし扱いにフォールバックする
 * （フェイルクローズ：判定できないときは管理機能を見せない）。
 */
export async function getAdminMe(): Promise<AdminMe> {
  const session = await auth();
  const discordId = session?.user.discordId;
  if (!discordId) return GUEST;

  try {
    return await apiFetch(`/api/admin/me?discord_id=${discordId}`);
  } catch {
    return GUEST;
  }
}
