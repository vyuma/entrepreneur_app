"use client";

import { useEffect, useRef, useState } from "react";

/** チェックの線の長さ。stroke-dashoffset を動かして「描かれる」演出にする */
const CHECK_LENGTH = 32;
/** 飛ばす粒の向き（度）と飛距離 */
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const SPARK_DISTANCE = 26;
/** 演出用クラスを外すまでの時間（CSS のアニメーション長に合わせる） */
const BURST_MS = 560;

/**
 * 大きなチェックマーク。朝活の「今朝やること」と TODO リストで共用する。
 *
 * 押した瞬間の反応を優先している（人は 100ms を超えると遅延として感じるため、
 * 完了状態は通信を待たずに切り替える前提で作ってある）。
 * 完了時はバネのオーバーシュート + 波紋 + 放射状の粒で「達成」を返し、
 * prefers-reduced-motion では色と形の変化だけを残す。
 */
export default function BigCheck({
  done,
  pending = false,
}: {
  done: boolean;
  pending?: boolean;
}) {
  const [burst, setBurst] = useState(false);
  // 初回描画時（既に完了済みのものを表示するだけ）は演出しない
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      setBurst(true);
      const timer = setTimeout(() => setBurst(false), BURST_MS);
      prevDone.current = done;
      return () => clearTimeout(timer);
    }
    prevDone.current = done;
  }, [done]);

  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center sm:h-12 sm:w-12">
      {/* 波紋。丸の外側へ広がって消える */}
      {burst && (
        <span
          aria-hidden="true"
          className="check-ripple pointer-events-none absolute inset-0 rounded-full"
          style={{
            border: "2px solid var(--brand-green)",
          }}
        />
      )}

      {/* 放射状に飛ぶ粒 */}
      {burst &&
        SPARK_ANGLES.map((angle, i) => (
          <span
            key={angle}
            aria-hidden="true"
            // inset-0 + m-auto で確実に中心へ置く（そこから外へ飛ばす）
            className="check-spark pointer-events-none absolute inset-0 m-auto h-1.5 w-1.5 rounded-full"
            style={
              {
                backgroundColor: "var(--brand-green)",
                "--angle": `${angle}deg`,
                "--distance": `${SPARK_DISTANCE}px`,
                animationDelay: `${i * 8}ms`,
              } as React.CSSProperties
            }
          />
        ))}

      <span
        aria-hidden="true"
        className={`relative grid h-full w-full place-items-center rounded-full border-2 transition-colors duration-200 ${
          burst ? "check-pop" : ""
        }`}
        style={{
          borderColor: done
            ? "var(--brand-green)"
            : "color-mix(in srgb, currentColor 20%, transparent)",
          backgroundColor: done ? "var(--brand-green)" : "transparent",
          // 演出中は keyframes が transform を持つので上書きしない
          transform: burst ? undefined : done ? "scale(1.06)" : "scale(1)",
          transition: burst
            ? "background-color 200ms, border-color 200ms"
            : "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          boxShadow: done
            ? "0 0 0 6px color-mix(in srgb, var(--brand-green) 15%, transparent)"
            : undefined,
        }}
      >
        {pending ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke={done ? "#fff" : "currentColor"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 sm:h-7 sm:w-7"
            style={{
              // 未完了時はうっすら見せて、押せることが分かるようにする
              opacity: done ? 1 : 0.18,
              transition: "opacity 150ms",
            }}
          >
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              strokeDasharray={CHECK_LENGTH}
              strokeDashoffset={done ? 0 : CHECK_LENGTH}
              style={{
                // 丸が凹んでから線が走るよう、わずかに遅らせる
                transition:
                  "stroke-dashoffset 260ms cubic-bezier(.2,.8,.3,1) 70ms",
              }}
            />
          </svg>
        )}
      </span>
    </span>
  );
}
