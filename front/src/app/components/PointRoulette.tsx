"use client";

import { useEffect, useRef, useState } from "react";

/** 数字が回っている時間（ms） */
const SPIN_MS = 1400;
/** 数字を差し替える間隔（ms） */
const TICK_MS = 60;

type Props = {
  /** 最終的に表示するポイント。null の間は待機状態 */
  target: number | null;
  /** 回転中に出す数字の範囲 */
  min: number;
  max: number;
  /** 待機中に表示する文字（未確定を示す） */
  placeholder?: string;
  /** 回転が終わったときに呼ばれる */
  onSettled?: () => void;
  /** ラッキーチャンス演出（色を変える） */
  lucky?: boolean;
};

/**
 * ログインポイントのルーレット。
 * target が入った瞬間から数字がランダムに変動し、減速して当選値に着地する。
 */
export default function PointRoulette({
  target,
  min,
  max,
  placeholder = "??",
  onSettled,
  lucky = false,
}: Props) {
  const [display, setDisplay] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  // 演出中に props が変わっても最新の値を使えるようにする
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (target === null) {
      setDisplay(null);
      setSpinning(false);
      return;
    }

    setSpinning(true);
    const started = Date.now();
    const low = Math.max(Math.min(min, target), 0);
    const high = Math.max(max, target);

    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const elapsed = Date.now() - started;
      if (elapsed >= SPIN_MS) {
        setDisplay(target);
        setSpinning(false);
        settledRef.current?.();
        return;
      }
      setDisplay(low + Math.floor(Math.random() * (high - low + 1)));
      // 終盤ほど間隔を広げて「止まりそう」に見せる
      const slowdown = 1 + (elapsed / SPIN_MS) ** 3 * 6;
      timer = setTimeout(tick, TICK_MS * slowdown);
    };
    tick();

    return () => clearTimeout(timer);
  }, [target, min, max]);

  const settled = target !== null && !spinning;
  const color = lucky ? "var(--brand-yellow)" : "var(--brand-green)";

  return (
    <output
      // 読み上げは下の数字ではなく aria-label の文言を使う
      // （回転中の乱数を読み上げさせない）
      aria-label={
        settled ? `${target}ポイント獲得` : spinning ? "抽選中" : placeholder
      }
      className="inline-flex items-baseline gap-1 font-mono tabular-nums"
    >
      <span
        className={`text-4xl font-semibold transition-transform duration-200 ${
          spinning ? "scale-105" : settled ? "scale-110" : ""
        }`}
        style={{
          color: display === null ? undefined : color,
          // 回転中は下端を揃えたまま桁数の増減でガタつかないよう幅を確保する
          minWidth: "2.6ch",
          textAlign: "right",
          textShadow: settled ? `0 0 18px ${color}` : undefined,
        }}
      >
        {display ?? placeholder}
      </span>
      <span className="text-sm text-zinc-400">pt</span>
    </output>
  );
}
