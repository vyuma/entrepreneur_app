import { updateProfile } from "@/actions/profile";
import PortfolioCallout from "@/app/components/PortfolioCallout";
import SubmitButton from "@/app/components/SubmitButton";
import { auth } from "@/auth";
import { apiFetch } from "@/lib/api";
import { SNS_FIELDS, snsFieldName } from "@/lib/sns";
import SkillEditor, { type Skill } from "./SkillEditor";

type User = {
  id: string | null;
  display_name: string | null;
  bio: string | null;
  business_desc: string | null;
  sns_links: Record<string, string> | null;
  portfolio_public: boolean;
};

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

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

  const sns = user.sns_links ?? {};

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        プロフィール
      </h1>

      {/* ポートフォリオを最上部に置いて埋もれないようにする */}
      <PortfolioCallout userId={user.id} isPublic={user.portfolio_public} />

      <form action={updateProfile} className="flex flex-col gap-6">
        {/* 既知でないSNSキーを保持するため、元の値を持ち回す */}
        <input type="hidden" name="sns_existing" value={JSON.stringify(sns)} />

        <section className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
            基本情報
          </h2>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="display_name"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              表示名
            </label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={user.display_name ?? ""}
              placeholder="メンバー一覧に表示される名前"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bio"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              一言自己紹介
            </label>
            <input
              id="bio"
              name="bio"
              defaultValue={user.bio ?? ""}
              maxLength={100}
              placeholder="例: 名大工学部2年。教育×AIで起業準備中です"
              className={inputClass}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              メンバー一覧のカードとポートフォリオの冒頭に表示されます。
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="business_desc"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              事業・活動内容
            </label>
            <textarea
              id="business_desc"
              name="business_desc"
              rows={4}
              defaultValue={user.business_desc ?? ""}
              placeholder="取り組んでいる事業やプロジェクト、興味のある領域など"
              className={inputClass}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
              SNS・リンク
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              入力したものだけがプロフィールに表示されます。空欄にすると削除されます。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SNS_FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={snsFieldName(field.key)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {field.label}
                </label>
                <input
                  id={snsFieldName(field.key)}
                  name={snsFieldName(field.key)}
                  type="url"
                  defaultValue={sns[field.key] ?? ""}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 保存すると何が起きるかを明示する */}
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
            保存して自己紹介を投稿
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            保存すると、Discordの自己紹介チャンネルに上記の内容が投稿されます。
            <br />
            内容を更新したいときは、書き換えてもう一度保存してください（新しい投稿として送られます）。
          </p>

          <SubmitButton
            pendingLabel="保存して投稿しています..."
            className="self-start rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            保存してDiscordに投稿
          </SubmitButton>
        </section>
      </form>

      <SkillEditor skills={skills} userId={user.id} />
    </div>
  );
}
