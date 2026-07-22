import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      discordId: string;
    } & DefaultSession["user"];
    /** バックエンドへのユーザー同期が完了しているか */
    synced?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    username?: string;
    avatar?: string | null;
    globalName?: string | null;
    synced?: boolean;
    /** 最後に同期を試みた時刻（epoch ms）。失敗時の再試行間隔に使う */
    syncedAt?: number;
  }
}
