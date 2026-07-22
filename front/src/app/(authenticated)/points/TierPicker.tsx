"use client";

import { useActionState } from "react";
import {
  setDisplayTier,
  type TierActionResult,
  type TierState,
} from "@/actions/tier";
import { POINTS_LADDER, TIER_STYLES } from "@/lib/tiers";

/**
 * 表示に使うランク色を選ぶ。
 * 到達済みのものだけ選択でき、未到達は必要ポイントを添えてロック表示にする。
 */
export default function TierPicker({ state }: { state: TierState }) {
  const [result, action, pending] = useActionState<
    TierActionResult | null,
    FormData
  >(setDisplayTier, null);

  const current = result?.state ?? state;
  const unlocked = new Set(current.unlocked);
  const isAuto = current.preference === null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
        ランク色を選ぶ
      </h2>
      <p className="mt-1 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        到達したことのある色から、お気に入りを表示に使えます。
        ホーム・ポイント・ポートフォリオの装飾に反映されます。
      </p>

      <div className="flex flex-wrap gap-2">
        {/* 自動追従 */}
        <form action={action}>
          <input type="hidden" name="tier" value="auto" />
          <button
            type="submit"
            disabled={pending}
            aria-pressed={isAuto}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
              isAuto
                ? "border-[var(--brand-green)] text-[var(--brand-green)]"
                : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {isAuto ? "✓ " : ""}現在ランクに追従
          </button>
        </form>

        {POINTS_LADDER.map((step) => {
          const style = TIER_STYLES[step.tier];
          const available = unlocked.has(step.tier);
          const selected = current.preference === step.tier;

          if (!available) {
            return (
              <span
                key={step.tier}
                title={`${step.threshold}pt で解放`}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-400 dark:border-zinc-700"
              >
                <span aria-hidden="true">🔒</span>
                {style.label}
                <span className="font-mono tabular-nums">
                  {step.threshold}pt
                </span>
              </span>
            );
          }

          return (
            <form action={action} key={step.tier}>
              <input type="hidden" name="tier" value={step.tier} />
              <button
                type="submit"
                disabled={pending}
                aria-pressed={selected}
                className={`rounded-full p-px transition-opacity hover:opacity-80 disabled:opacity-50 ${style.wrapper}`}
              >
                <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs dark:bg-zinc-900">
                  {selected && (
                    <span style={{ color: "var(--brand-green)" }}>✓</span>
                  )}
                  <span className={style.labelClass}>{style.label}</span>
                </span>
              </button>
            </form>
          );
        })}
      </div>

      {result && (
        <p
          className="mt-3 text-xs"
          style={{
            color: result.ok ? "var(--brand-green)" : "var(--brand-orange)",
          }}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}
