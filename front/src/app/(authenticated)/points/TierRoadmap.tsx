"use client";

import { POINTS_LADDER, resolveTier, TIER_STYLES } from "@/lib/tiers";

/**
 * ランクのステップアップを見せるロードマップ。
 *
 * 全ティアを並べ、到達済み・現在地・未到達を一目で分かるようにする。
 * 「次まであと何pt」と、それが作業時間なら何時間分かも示して
 * 次の行動につながるようにしている。
 */
export default function TierRoadmap({ totalPoints }: { totalPoints: number }) {
  const current = resolveTier(totalPoints, POINTS_LADDER);

  const currentIndex = POINTS_LADDER.reduce(
    (acc, step, i) => (totalPoints >= step.threshold ? i : acc),
    0,
  );
  const nextStep = POINTS_LADDER[currentIndex + 1];
  const currentStep = POINTS_LADDER[currentIndex];

  // 現在ランクの区間内での進捗
  const spanStart = currentStep.threshold;
  const spanEnd = nextStep?.threshold ?? spanStart;
  const spanProgress = nextStep
    ? Math.min(
        100,
        Math.max(0, ((totalPoints - spanStart) / (spanEnd - spanStart)) * 100),
      )
    : 100;
  const remaining = nextStep ? nextStep.threshold - totalPoints : 0;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          ランクロードマップ
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-zinc-400">
          {currentIndex + 1} / {POINTS_LADDER.length} 到達
        </span>
      </div>
      <p className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">
        累計アントレポイント（作業ポイント +
        活動ポイント）でランクが上がります。
      </p>

      {/* 現在地と次のランク */}
      <div className="mb-6 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`font-mono text-xs tracking-[0.2em] ${current.labelClass}`}
          >
            ▸ {current.label}
          </span>
          {nextStep ? (
            <span className="font-mono text-xs tracking-[0.2em] text-zinc-400">
              {TIER_STYLES[nextStep.tier].label} まで
              <span className="ml-1.5 font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                {remaining}pt
              </span>
            </span>
          ) : (
            <span className="font-mono text-xs tracking-[0.2em] text-zinc-400">
              最高ランク到達
            </span>
          )}
        </div>

        {/* 区間の進捗バー */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${current.wrapper}`}
            style={{ width: `${spanProgress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-zinc-400">
          <span>{spanStart}pt</span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {totalPoints}pt
          </span>
          <span>{nextStep ? `${spanEnd}pt` : "MAX"}</span>
        </div>

        {nextStep && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            あと <strong className="font-medium">{remaining}pt</strong> で
            <span className={TIER_STYLES[nextStep.tier].labelClass}>
              {" "}
              {TIER_STYLES[nextStep.tier].label}{" "}
            </span>
            に到達します。作業時間なら {remaining} 時間、
            ログインボーナスなら最短 {Math.ceil(remaining / 50)} 日分です。
          </p>
        )}
      </div>

      {/* 全ランクの一覧。段数が多いので上位は折りたたむ */}
      <ol className="flex max-h-[22rem] flex-col overflow-y-auto pr-1">
        {POINTS_LADDER.map((step, i) => {
          const style = TIER_STYLES[step.tier];
          const reached = totalPoints >= step.threshold;
          const isCurrent = i === currentIndex;
          const isNext = i === currentIndex + 1;

          return (
            <li
              key={step.tier}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                isCurrent ? "bg-zinc-50 dark:bg-zinc-800/60" : ""
              }`}
            >
              {/* 到達マーカー */}
              <span className="relative flex w-4 justify-center">
                {i < POINTS_LADDER.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-4 h-6 w-px"
                    style={{
                      backgroundColor: reached
                        ? "var(--brand-green)"
                        : "currentColor",
                      opacity: reached ? 0.5 : 0.12,
                    }}
                  />
                )}
                <span
                  className={`relative z-10 h-3 w-3 rounded-full p-px ${
                    reached ? style.wrapper : ""
                  }`}
                  style={
                    reached
                      ? undefined
                      : {
                          backgroundColor:
                            "color-mix(in srgb, currentColor 15%, transparent)",
                        }
                  }
                >
                  <span className="block h-full w-full rounded-full bg-white dark:bg-zinc-900" />
                </span>
              </span>

              <span
                className={`min-w-0 truncate font-mono text-xs tracking-[0.16em] ${
                  reached ? style.labelClass : "text-zinc-400"
                } ${isCurrent ? "font-bold" : ""}`}
              >
                {style.label}
              </span>

              {isCurrent && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: "var(--brand-green)" }}
                >
                  現在
                </span>
              )}
              {isNext && (
                <span className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  次
                </span>
              )}

              <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-zinc-400">
                {step.threshold.toLocaleString()}pt
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
