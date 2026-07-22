"use client";

import { useActionState } from "react";
import {
  type EventActionResult,
  grantAward,
  revokeAward,
} from "@/actions/event";
import { AWARD_PRESETS, type EventDetail } from "@/types/event";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

/** 管理者が賞を授与するパネル。ポイントも同時に付与できる。 */
export default function AwardPanel({ detail }: { detail: EventDetail }) {
  const { event, entries, awards } = detail;

  const [grantState, grantAction, granting] = useActionState<
    EventActionResult | null,
    FormData
  >(grantAward, null);
  const [revokeState, revokeAction] = useActionState<
    EventActionResult | null,
    FormData
  >(revokeAward, null);

  const message = grantState ?? revokeState;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-yellow)" }}
        />
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          賞の授与
        </h2>
      </div>

      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        オーディエンス賞は得票1位の発表に、NueStar賞は主催者の判断で授与します。
        ポイントを入力すると受賞者にアントレポイントも付きます。
      </p>

      {/* 授与済み */}
      {awards.length > 0 && (
        <ul className="flex flex-col">
          {awards.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-2 border-t border-zinc-100 py-2 first:border-t-0 dark:border-zinc-800/70"
            >
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: "var(--brand-yellow)" }}
              >
                {a.name}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                {a.entry_title}
                <span className="ml-1 text-xs text-zinc-400">
                  / {a.winner_name}
                </span>
              </span>
              {a.points > 0 && (
                <span
                  className="shrink-0 font-mono text-xs tabular-nums"
                  style={{ color: "var(--brand-green)" }}
                >
                  +{a.points}pt
                </span>
              )}
              <form action={revokeAction}>
                <input type="hidden" name="event_id" value={event.id} />
                <input type="hidden" name="award_id" value={a.id} />
                <button
                  type="submit"
                  onClick={(e) => {
                    if (
                      !window.confirm(
                        `「${a.name}」を取り消しますか？付与したポイントも打ち消されます。`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
                >
                  取消
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* 授与フォーム */}
      <form
        action={grantAction}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <input type="hidden" name="event_id" value={event.id} />

        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          受賞する発表
          <select name="entry_id" required className={inputClass}>
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}（{e.team_name}）
                {e.vote_count !== null ? ` ${e.vote_count}票` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          賞の名前
          <select name="name" className={inputClass}>
            {AWARD_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          別の名前にする（任意）
          <input
            type="text"
            name="name_custom"
            maxLength={60}
            placeholder="例: ベストピッチ賞"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          アントレポイント
          <input
            type="number"
            name="points"
            min={0}
            max={1000}
            defaultValue={0}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          講評（任意）
          <input type="text" name="note" className={inputClass} />
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={granting || entries.length === 0}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-yellow)" }}
          >
            {granting ? "授与中..." : "賞を授与する"}
          </button>
          {message && (
            <p
              className="text-sm"
              style={{
                color: message.ok
                  ? "var(--brand-green)"
                  : "var(--brand-orange)",
              }}
            >
              {message.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
