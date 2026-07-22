import { updateProfile } from "@/actions/profile";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import SkillEditor, { type Skill } from "./SkillEditor";

type User = {
  id: string | null;
  display_name: string | null;
  bio: string | null;
  business_desc: string | null;
  sns_links: Record<string, string> | null;
  portfolio_public: boolean;
};

export default async function ProfilePage() {
  const session = await auth();
  const discordId = session!.user.discordId;

  let user: User = {
    id: null,
    display_name: null,
    bio: null,
    business_desc: null,
    sns_links: null,
    portfolio_public: false,
  };
  let skills: Skill[] = [];
  try {
    [user, skills] = await Promise.all([
      apiFetch(`/api/users/me?discord_id=${discordId}`),
      apiFetch(`/api/members/skills/me?discord_id=${discordId}`),
    ]);
  } catch {
    // バックエンド未起動時は空フォーム
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        プロフィール編集
      </h1>

      <form action={updateProfile} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            表示名
          </label>
          <input
            name="display_name"
            defaultValue={user.display_name ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            一言自己紹介
          </label>
          <input
            name="bio"
            defaultValue={user.bio ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            事業・活動内容
          </label>
          <textarea
            name="business_desc"
            rows={4}
            defaultValue={user.business_desc ?? ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            SNSリンク{" "}
            <span className="font-normal text-zinc-400">
              (JSON形式: {`{"Twitter": "https://..."}`})
            </span>
          </label>
          <input
            name="sns_links"
            defaultValue={user.sns_links ? JSON.stringify(user.sns_links) : ""}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          保存して自己紹介を投稿
        </button>
      </form>

      <SkillEditor
        skills={skills}
        userId={user.id}
        portfolioPublic={user.portfolio_public}
      />
    </div>
  );
}
