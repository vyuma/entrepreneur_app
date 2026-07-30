/** チェックの線の長さ。stroke-dashoffset を動かして「描かれる」演出にする */
const CHECK_LENGTH = 32;

/**
 * 大きなチェックマーク。
 * 未完了は空の丸、完了すると丸がブランドグリーンに塗られてチェックが描かれる。
 * 朝活の「今朝やること」と TODO リストで共用する。
 */
export default function BigCheck({
  done,
  pending = false,
}: {
  done: boolean;
  pending?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12"
      style={{
        borderColor: done
          ? "var(--brand-green)"
          : "color-mix(in srgb, currentColor 20%, transparent)",
        backgroundColor: done ? "var(--brand-green)" : "transparent",
        transform: done ? "scale(1.06)" : "scale(1)",
        boxShadow: done
          ? "0 0 0 6px color-mix(in srgb, var(--brand-green) 15%, transparent)"
          : undefined,
      }}
    >
      {pending ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
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
            transition: "opacity 200ms",
          }}
        >
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            strokeDasharray={CHECK_LENGTH}
            strokeDashoffset={done ? 0 : CHECK_LENGTH}
            style={{
              transition:
                "stroke-dashoffset 320ms cubic-bezier(.4,0,.2,1) 60ms",
            }}
          />
        </svg>
      )}
    </span>
  );
}
