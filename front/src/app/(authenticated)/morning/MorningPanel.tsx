"use client";

import { useEffect, useState, useTransition } from "react";
import {
  checkinMorning,
  postMorningDeclaration,
  toggleMorningTask,
} from "@/actions/morning";
import BigCheck from "@/app/components/BigCheck";
import PointRoulette from "@/app/components/PointRoulette";
import { hapticCancel, hapticSuccess } from "@/lib/haptics";
import type { MorningStatus } from "@/types/morning";
import StampCard from "./StampCard";

type Message = { ok: boolean; text: string } | null;

export default function MorningPanel({ status }: { status: MorningStatus }) {
  // サーバーからの再取得を待たずに、操作結果で即座に表示を更新する
  const [current, setCurrent] = useState(status);
  const [message, setMessage] = useState<Message>(null);
  // 保存に失敗した行を短く揺らして知らせる
  const [failedTaskId, setFailedTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // ルーレットに出す獲得ポイント。null の間は回っていない
  const [rouletteTarget, setRouletteTarget] = useState<number | null>(null);
  const [rouletteLucky, setRouletteLucky] = useState(false);
  const [draft, setDraft] = useState(status.post_draft);

  useEffect(() => {
    setCurrent(status);
    setDraft(status.post_draft);
  }, [status]);

  const doCheckin = () => {
    startTransition(async () => {
      const res = await checkinMorning(null);
      if (res.result) {
        setCurrent(res.result.status);
        setDraft(res.result.status.post_draft);
        // 新規チェックインのときだけルーレットを回す
        if (res.result.newly_checked_in) {
          setRouletteLucky(res.result.lucky_points > 0);
          setRouletteTarget(res.result.points);
        }
      }
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const doPost = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("content", draft);
      const res = await postMorningDeclaration(null, formData);
      if (res.result) setCurrent(res.result.status);
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  /**
   * やることリストの消化を切り替える。
   * 通信を待つと反応が 100ms を超えて重く感じるため、先に画面上のチェックを
   * 反転させてから保存し、失敗したときだけ元に戻す（楽観更新）。
   */
  const doToggle = (taskId: string, done: boolean) => {
    const snapshot = current;
    setCurrent((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)),
      done_count: prev.done_count + (done ? 1 : -1),
    }));
    if (done) hapticSuccess();

    startTransition(async () => {
      const formData = new FormData();
      formData.set("task_id", taskId);
      formData.set("done", String(done));
      const res = await toggleMorningTask(null, formData);
      if (res.result) {
        setCurrent(res.result.status);
      } else {
        setCurrent(snapshot);
        hapticCancel();
        setFailedTaskId(taskId);
        setTimeout(() => setFailedTaskId(null), 400);
      }
      setMessage(res.message ? { ok: res.ok, text: res.message } : null);
    });
  };

  const checkedIn = current.checked_in_today;
  const total = current.tasks.length;
  const progress =
    total === 0 ? 0 : Math.round((current.done_count / total) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* --- チェックイン --- */}
      <section className="rounded-xl p-px bg-gradient-to-r from-[var(--brand-yellow)] via-[var(--brand-orange)] to-[var(--brand-green)]">
        <div className="flex flex-col gap-5 rounded-[11px] bg-white p-5 dark:bg-zinc-900">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                受付時間 {current.start_at}〜{current.end_at} JST
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-sm font-semibold text-black dark:text-zinc-50">
                  連続朝活
                </span>
                <span className="text-3xl font-semibold tabular-nums text-black dark:text-zinc-50">
                  {current.streak}
                </span>
                <span className="text-xs text-zinc-400">日</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                最長 {current.longest_streak}日 · 通算 {current.total_days}日
                {checkedIn && current.checkin_at
                  ? ` · 今朝は ${current.checkin_at} にチェックイン`
                  : ` · 現在 ${current.now_at}`}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={doCheckin}
                disabled={isPending || checkedIn || !current.is_open}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: checkedIn
                    ? "#a1a1aa"
                    : current.is_open
                      ? "var(--brand-orange)"
                      : "#a1a1aa",
                }}
              >
                {isPending && !checkedIn && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {checkedIn
                  ? "チェックイン済み"
                  : !current.is_open
                    ? "受付時間外"
                    : current.lucky_pending || current.roulette_enabled
                      ? "ルーレットを回す 🎰"
                      : `朝活チェックイン（+${current.today_points}pt）`}
              </button>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {!current.enabled
                  ? "朝活プログラムは停止中です"
                  : checkedIn
                    ? `明日も続けると +${current.next_points}pt`
                    : !current.is_open
                      ? `次の受付は ${current.start_at} から`
                      : current.lucky_pending
                        ? `ラッキーチャンス！ ${current.today_points}pt + ${current.lucky_min}〜${current.lucky_max}pt`
                        : current.roulette_enabled
                          ? `基礎 ${current.roulette_min}〜${current.roulette_max}pt のルーレット + 連続ボーナス`
                          : `基礎 ${current.base_points}pt + 連続ボーナス`}
              </p>
            </div>
          </div>

          {/* ポイントルーレット。受け取り前は ?? を出し、押すと数字が回る */}
          {(rouletteTarget !== null || (!checkedIn && current.is_open)) && (
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
                      : "今朝の獲得ポイント"
                    : current.lucky_pending
                      ? `連続が途切れています。今日はランダムで ${current.lucky_min}〜${current.lucky_max}pt の救済ボーナス付き`
                      : current.roulette_enabled
                        ? `チェックインすると回ります。基礎ポイントは毎日 ${current.roulette_min}〜${current.roulette_max}pt`
                        : "チェックインすると回ります"}
                </p>
              </div>
              <PointRoulette
                target={rouletteTarget}
                min={
                  current.lucky_pending
                    ? current.today_points + current.lucky_min
                    : // today_points はルーレット上限での見積もりなので、
                      // 下限は取りうる幅の分だけ引いて出す
                      current.today_points -
                      (current.roulette_max - current.roulette_min)
                }
                max={
                  current.lucky_pending
                    ? current.today_points + current.lucky_max
                    : current.today_points + current.lucky_max
                }
                lucky={rouletteLucky}
              />
            </div>
          )}

          {/* 一週間のスタンプカード */}
          <StampCard
            recentDates={current.recent_dates}
            stampedToday={checkedIn}
          />

          {message && (
            <p
              className="text-sm font-medium"
              style={{
                color: message.ok
                  ? "var(--brand-green)"
                  : "var(--brand-orange)",
              }}
            >
              {message.ok ? "🌅 " : ""}
              {message.text}
            </p>
          )}
        </div>
      </section>

      {/* --- 朝にすべきことリスト --- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              今朝やること
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              タップでクリア、1件ごとに +{current.task_points}pt
              {checkedIn ? "" : "（チェックイン後に記録できます）"}
            </p>
          </div>
          <span className="font-mono tabular-nums text-zinc-400">
            <span
              className="text-2xl font-semibold transition-colors"
              style={{
                color:
                  current.done_count > 0 ? "var(--brand-green)" : undefined,
              }}
            >
              {current.done_count}
            </span>
            <span className="text-sm"> / {total}</span>
          </span>
        </div>

        {total > 0 && (
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, var(--brand-yellow), var(--brand-green))",
              }}
            />
          </div>
        )}

        {total === 0 ? (
          <p className="text-sm text-zinc-400">
            まだリストが設定されていません。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {current.tasks.map((task) => {
              // 投稿でクリアする項目は手動チェックさせない
              const locked = !checkedIn || task.complete_on_post;
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => doToggle(task.id, !task.done)}
                    disabled={locked}
                    aria-pressed={task.done}
                    className={`group flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition-all duration-200 enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70 enabled:active:scale-[0.98] sm:p-4 ${
                      failedTaskId === task.id ? "shake-x" : ""
                    }`}
                    style={{
                      borderColor: task.done
                        ? "var(--brand-green)"
                        : "color-mix(in srgb, currentColor 12%, transparent)",
                      backgroundColor: task.done
                        ? "color-mix(in srgb, var(--brand-green) 8%, transparent)"
                        : undefined,
                    }}
                  >
                    <BigCheck done={task.done} />

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[15px] font-medium transition-colors sm:text-base ${
                          task.done
                            ? "text-zinc-400 line-through decoration-[1.5px]"
                            : "text-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.description && !task.done && (
                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                          {task.description}
                        </span>
                      )}
                      {task.complete_on_post && !task.done && (
                        <span className="mt-1.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          下の宣言投稿でクリア
                        </span>
                      )}
                    </span>

                    {/* 獲得ポイント。クリア済みは緑で確定表示 */}
                    <span
                      className={`shrink-0 font-mono text-xs tabular-nums transition-all duration-300 ${
                        task.done
                          ? "scale-110 font-semibold"
                          : "text-zinc-300 dark:text-zinc-600"
                      }`}
                      style={{
                        color: task.done ? "var(--brand-green)" : undefined,
                      }}
                    >
                      +{current.task_points}pt
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 全部クリアしたときのごほうび表示 */}
        {total > 0 && current.done_count === total && (
          <p
            className="mt-4 rounded-lg border px-4 py-3 text-center text-sm font-medium"
            style={{
              borderColor: "var(--brand-green)",
              color: "var(--brand-green)",
              backgroundColor:
                "color-mix(in srgb, var(--brand-green) 8%, transparent)",
            }}
          >
            🎉 今朝のリストを全部クリアしました！最高の一日にしましょう
          </p>
        )}
      </section>

      {/* --- 朝活宣言の投稿 --- */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            朝活宣言を投稿する
          </h2>
          <span className="font-mono text-xs text-zinc-400">
            +{current.post_points}pt
          </span>
        </div>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          自分の times チャンネルに投稿されます。文章は入力済みなので、
          そのまま押すだけでも大丈夫です。
          {current.posted_today
            ? "（本日分は投稿済み）"
            : checkedIn
              ? ""
              : "（チェックイン後に投稿できます）"}
        </p>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={6}
          maxLength={1900}
          disabled={current.posted_today || !checkedIn}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--brand-blue)] disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={doPost}
            disabled={
              isPending || current.posted_today || !checkedIn || !draft.trim()
            }
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: current.posted_today
                ? "#a1a1aa"
                : "var(--brand-blue)",
            }}
          >
            {current.posted_today
              ? "投稿済み"
              : isPending
                ? "投稿中..."
                : "Discord に投稿してクリア"}
          </button>
          {!current.posted_today && checkedIn && (
            <button
              type="button"
              onClick={() => setDraft(current.post_draft)}
              className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              定型文に戻す
            </button>
          )}
        </div>
      </section>

      {/* --- 朝活のコツ --- */}
      {current.tips.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            朝活を続けるコツ
          </h2>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            早起きは根性ではなく仕組みで決まります。
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {current.tips.map((tip) => (
              <li
                key={tip.id}
                className="rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800"
              >
                <p className="flex items-baseline gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--brand-yellow)" }}
                  />
                  {tip.title}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {tip.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
