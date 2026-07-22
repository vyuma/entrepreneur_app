import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { fetchWithRetry } from "@/lib/fetch-retry";

/** ユーザー同期に失敗した後、次に再試行するまでの間隔 */
const SYNC_RETRY_MS = 5 * 60 * 1000;

type DiscordProfile = {
  id: string;
  username?: string;
  avatar?: string | null;
  global_name?: string | null;
};

/** バックエンドへユーザー情報を同期する。失敗しても例外は投げず false を返す。 */
async function syncUser(input: {
  discordId: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<boolean> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!apiUrl || !secret) {
    console.error(
      "[auth] NEXT_PUBLIC_API_URL / INTERNAL_API_SECRET が未設定です",
    );
    return false;
  }

  const res = await fetchWithRetry(
    `${apiUrl}/api/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": secret,
      },
      body: JSON.stringify({
        discord_id: input.discordId,
        username: input.username,
        display_name: input.displayName ?? null,
        avatar_url: input.avatarUrl ?? null,
      }),
    },
    // バックエンドはローカル/同一ネットワーク想定なので短く切り上げる
    { retries: 1, timeoutMs: 3000 },
  );

  if (res === null) {
    console.error(
      `[auth] バックエンド (${apiUrl}) に接続できません。起動しているか確認してください。`,
    );
    return false;
  }
  if (!res.ok) {
    console.error("[auth] ユーザー同期に失敗:", res.status);
    return false;
  }
  return true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: {
    error: "/auth/error",
  },
  providers: [
    Discord({
      authorization: {
        params: { scope: "identify email guilds.members.read" },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (!account?.access_token) return "/auth/error?reason=no_token";

      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) {
        console.error("[auth] DISCORD_GUILD_ID が未設定です");
        return "/auth/error?reason=config";
      }

      const res = await fetchWithRetry(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        { headers: { Authorization: `Bearer ${account.access_token}` } },
      );

      // Discord 側の障害・レート制限は「未参加」と区別してエラー画面へ
      if (res === null) return "/auth/error?reason=discord_unavailable";
      if (res.status === 429 || res.status >= 500) {
        return "/auth/error?reason=discord_unavailable";
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return "/auth/not-member";
      }
      if (!res.ok) return "/auth/error?reason=discord";

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        const p = profile as DiscordProfile;
        token.discordId = p.id;
        token.username = p.username ?? "";
        token.avatar = p.avatar ?? null;
        token.globalName = p.global_name ?? null;
      }

      // 初回、および前回の同期に失敗している場合のみ再試行する。
      // 同期失敗でログイン自体は落とさず、バックエンド停止中に毎リクエスト
      // リトライしてページが重くならないよう再試行間隔を空ける。
      const now = Date.now();
      const shouldRetry =
        token.syncedAt === undefined || now - token.syncedAt > SYNC_RETRY_MS;

      if (token.discordId && token.synced !== true && shouldRetry) {
        token.syncedAt = now;
        token.synced = await syncUser({
          discordId: token.discordId,
          username: token.username,
          displayName: token.globalName ?? null,
          avatarUrl: token.avatar
            ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.avatar}.png`
            : null,
        });
      }

      return token;
    },

    async session({ session, token }) {
      session.user.discordId = token.discordId ?? "";
      session.synced = token.synced === true;
      return session;
    },
  },
});
