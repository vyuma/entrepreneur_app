import Link from "next/link";
import { addSkill, removeSkill } from "@/actions/settings";
import SubmitButton from "@/app/components/SubmitButton";

export type Skill = { id: string; label: string; source: string };

export default function SkillEditor({
  skills,
  userId,
}: {
  skills: Skill[];
  userId: string | null;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-blue)" }}
        />
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          スキルタグ
        </h2>
        {skills.length > 0 && (
          <span className="font-mono text-[11px] tabular-nums text-zinc-400">
            {skills.length}
          </span>
        )}
      </div>

      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        得意なことを登録すると、メンバー一覧で絞り込まれるようになり、ポートフォリオにも表示されます。
        {skills.length === 0 && " まずは1つ追加してみてください。"}
      </p>

      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li key={s.id}>
              <form action={removeSkill}>
                <input type="hidden" name="skill_id" value={s.id} />
                <button
                  type="submit"
                  title="クリックで削除"
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:opacity-70"
                  style={{
                    borderColor: "var(--brand-blue)",
                    color: "var(--brand-blue)",
                  }}
                >
                  {s.label}
                  <span aria-hidden="true">×</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addSkill} className="flex gap-2">
        <input
          type="text"
          name="label"
          required
          maxLength={40}
          placeholder="例: React, 事業計画, 資金調達"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-blue)] dark:border-zinc-700 dark:bg-zinc-950"
        />
        <SubmitButton
          pendingLabel="追加中..."
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ backgroundColor: "var(--brand-blue)" }}
        >
          追加
        </SubmitButton>
      </form>

      {userId && (
        <Link
          href={`/portfolio/${userId}`}
          className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
        >
          ポートフォリオでの見え方を確認する →
        </Link>
      )}
    </section>
  );
}
