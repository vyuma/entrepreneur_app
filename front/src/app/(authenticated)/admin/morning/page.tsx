import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_MORNING_SETTING,
  type MorningSetting,
  type MorningTask,
  type MorningTip,
} from "@/types/morning";
import MorningManager from "./MorningManager";

export default async function AdminMorningPage() {
  const session = await auth();
  const discordId = session!.user.discordId;
  const q = `discord_id=${discordId}`;

  let setting: MorningSetting = DEFAULT_MORNING_SETTING;
  let tasks: MorningTask[] = [];
  let tips: MorningTip[] = [];
  let error: string | null = null;

  try {
    [setting, tasks, tips] = await Promise.all([
      apiFetch(`/api/morning/admin/settings?${q}`),
      apiFetch(`/api/morning/admin/tasks?${q}`),
      apiFetch(`/api/morning/admin/tips?${q}`),
    ]);
  } catch {
    error = "朝活の設定を取得できませんでした。";
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
      <MorningManager setting={setting} tasks={tasks} tips={tips} />
    </div>
  );
}
