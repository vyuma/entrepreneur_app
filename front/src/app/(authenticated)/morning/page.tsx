import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { EMPTY_MORNING_STATUS, type MorningStatus } from "@/types/morning";
import MorningPanel from "./MorningPanel";

export const metadata = { title: "朝活 | NueStar" };

export default async function MorningPage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let status: MorningStatus = EMPTY_MORNING_STATUS;
  let error: string | null = null;
  try {
    status = await apiFetch(`/api/morning/status?discord_id=${discordId}`);
  } catch {
    error = "朝活の状況を取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Morning Program
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-black dark:text-zinc-50">
          朝活
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {status.start_at}〜{status.end_at}（日本時間）にアプリを開いて
          チェックインすると朝活ポイントがもらえます。
        </p>
      </div>

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

      <MorningPanel status={status} />
    </div>
  );
}
