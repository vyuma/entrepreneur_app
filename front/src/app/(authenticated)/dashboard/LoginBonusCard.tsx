"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { claimLoginBonus } from "@/actions/login-bonus";
import PointRoulette from "@/app/components/PointRoulette";
import { POINTS_LADDER, resolveTier, TIER_STYLES } from "@/lib/tiers";
import type { LoginBonusStatus } from "@/types/login-bonus";

/** ルーレット回転中に出す数字の下限（連続1日目の付与ポイント相当） */
const ROULETTE_FLOOR = 10;

/** 直近7日分の受け取り状況（今日を右端に置く） */
function recentWeek(recent: string[]): { date: string; claimed: boolean }[] {
  const set = new Set(recent.map((d) => d.slice(0, 10)));
  const days: { date: string; claimed: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: key, claimed: set.has(key) });
  }
  return days;
}

export default function LoginBonusCard({
  status,
}: {
  status: LoginBonusStatus;
}) {
  // 受け取り直後はサーバーの再取得を待たずに最新値を表示する
  const [current, setCurrent] = useState(status);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  // ルーレットに出す獲得ポイント。null の間は回っていない
  const [rouletteTarget, setRouletteTarget] = useState<number | null>(null);
  const [rouletteLucky, setRouletteLucky] = useState(false);

  useEffect(() => {
    setCurrent(status);
  }, [status]);

  const doClaim = () => {
    startTransition(async () => {
      const res = await claimLoginBonus(null);
      if (res.result) {
        setCurrent(res.result.status);
        if (res.result.newly_claimed) {
          setRouletteLucky(res.result.lucky_points > 0);
          setRouletteTarget(res.result.points);
        }
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const titleTier = TIER_STYLES[current.title_tier] ?? TIER_STYLES.entry;

  // 本人が選んだ表示色（未設定なら現在ランク）
  const rank =
    TIER_STYLES[current.display_tier] ??
    resolveTier(current.total_points, POINTS_LADDER);
  const nextRank = POINTS_LADDER.find(
    (step) => step.threshold > current.total_points,
  );
  const remaining = nextRank ? nextRank.threshold - current.total_points : 0;

  const week = recentWeek(current.recent_dates);
  const claimed = current.claimed_today;

  return (
    <div className={`rounded-xl p-px ${rank.wrapper}`}>
      <div className="flex flex-col gap-5 rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        {/* 現在のランク */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              累計アントレポイント
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span
                className={`text-3xl font-semibold tabular-nums ${rank.numberClass}`}
                style={rank.numberStyle}
              >
                {current.total_points.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">pt</span>
            </p>
          </div>

          <div className="text-right">
            <p
              className={`font-mono text-xs tracking-[0.16em] ${rank.labelClass}`}
            >
              ▸ {rank.label} TIER
            </p>
            {nextRank ? (
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                次の{TIER_STYLES[nextRank.tier].label}まで {remaining}pt
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                最高ランク到達
              </p>
            )}
            <Link
              href="/points"
              className="mt-0.5 inline-block text-[11px] text-zinc-400 hover:underline"
            >
              ランクの上がり方を見る →
            </Link>
          </div>
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

        {/* 連続ログイン */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-black dark:text-zinc-50">
                連続ログイン
                <span className="ml-1.5 text-xl tabular-nums">
                  {current.streak}
                </span>
                日
              </p>
              {/* 称号は連続日数で色が変わる */}
              <span className={`rounded-full p-px ${titleTier.wrapper}`}>
                <span className="block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium dark:bg-zinc-900">
                  <span className={titleTier.labelClass}>{current.title}</span>
                </span>
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {claimed
                ? `明日も続けると +${current.next_points}pt（最大${current.max_points}pt）`
                : current.lucky_pending
                  ? `ラッキーチャンス！ ${current.today_points}pt + ${current.lucky_min}〜${current.lucky_max}pt`
                  : `今日受け取ると +${current.today_points}pt`}
              　· 最長 {current.longest_streak}日 · 通算 {current.total_days}日
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={doClaim}
              disabled={pending || claimed}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: claimed ? "#a1a1aa" : "var(--brand-green)",
              }}
            >
              {pending && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {claimed
                ? "受け取り済み"
                : pending
                  ? "受け取り中..."
                  : current.lucky_pending
                    ? "ルーレットを回す 🎰"
                    : "ログインボーナスを受け取る"}
            </button>
          </div>
        </div>

        {/* ポイントルーレット。受け取り前は ?? を出し、押すと数字が回る */}
        {(rouletteTarget !== null || !claimed) && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
            style={{
              borderColor: rouletteLucky
                ? "var(--brand-yellow)"
                : "color-mix(in srgb, currentColor 12%, transparent)",
            }}
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {rouletteLucky ? "Lucky Chance" : "Point Roulette"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {rouletteTarget !== null
                  ? rouletteLucky
                    ? "ラッキーチャンス当選！連続が切れても救済ボーナスが出ました"
                    : "今日の獲得ポイント"
                  : current.lucky_pending
                    ? `連続が途切れています。今日はランダムで ${current.lucky_min}〜${current.lucky_max}pt の救済ボーナス付き`
                    : "受け取ると回ります"}
              </p>
            </div>
            <PointRoulette
              target={rouletteTarget}
              min={
                current.lucky_pending
                  ? current.today_points + current.lucky_min
                  : ROULETTE_FLOOR
              }
              max={current.today_points + current.lucky_max}
              lucky={rouletteLucky}
            />
          </div>
        )}

        {/* 直近7日 */}
        <div className="flex gap-1.5">
          {week.map((d, i) => (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                title={d.date}
                className="h-1.5 w-full rounded-full"
                style={{
                  backgroundColor: d.claimed
                    ? "var(--brand-green)"
                    : "color-mix(in srgb, currentColor 12%, transparent)",
                }}
              />
              <span className="font-mono text-[9px] text-zinc-400">
                {i === 6 ? "今日" : Number(d.date.slice(8, 10))}
              </span>
            </div>
          ))}
        </div>

        {message && !message.ok && (
          <p className="text-xs" style={{ color: "var(--brand-orange)" }}>
            {message.text}
          </p>
        )}
        {message?.ok && claimed && (
          <p
            className="text-sm font-medium"
            style={{ color: "var(--brand-green)" }}
          >
            🎉 {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
