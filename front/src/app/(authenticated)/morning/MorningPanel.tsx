"use client";

import { useEffect, useState, useTransition } from "react";
import { checkinMorning, toggleMorningTask } from "@/actions/morning";
import type { MorningStatus } from "@/types/morning";

/** 直近7日分のチェックイン状況（今日を右端に置く） */
function recentWeek(recent: string[]): { date: string; done: boolean }[] {
  const set = new Set(recent.map((d) => d.slice(0, 10)));
  const days: { date: string; done: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: key, done: set.has(key) });
  }
  return days;
}

type Message = { ok: boolean; text: string } | null;

export default function MorningPanel({ status }: { status: MorningStatus }) {
  // サーバーからの再取得を待たずに、操作結果で即座に表示を更新する
  const [current, setCurrent] = useState(status);
  const [message, setMessage] = useState<Message>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCurrent(status);
  }, [status]);

  const doCheckin = () => {
    startTransition(async () => {
      const res = await checkinMorning(null);
      if (res.result) setCurrent(res.result.status);
      setMessage({ ok: res.ok, text: res.message });
    });
  };

  const doToggle = (taskId: string, done: boolean) => {
    setPendingTaskId(taskId);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("task_id", taskId);
      formData.set("done", String(done));
      const res = await toggleMorningTask(null, formData);
      if (res.result) setCurrent(res.result.status);
      setMessage(res.message ? { ok: res.ok, text: res.message } : null);
      setPendingTaskId(null);
    });
  };

  const week = recentWeek(current.recent_dates);
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
                {isPending && !pendingTaskId && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {checkedIn
                  ? "チェックイン済み"
                  : current.is_open
                    ? `朝活チェックイン（+${current.today_points}pt）`
                    : "受付時間外"}
              </button>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {!current.enabled
                  ? "朝活プログラムは停止中です"
                  : checkedIn
                    ? `明日も続けると +${current.next_points}pt`
                    : current.is_open
                      ? `基礎 ${current.base_points}pt + 連続ボーナス`
                      : `次の受付は ${current.start_at} から`}
              </p>
            </div>
          </div>

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
                    backgroundColor: d.done
                      ? "var(--brand-orange)"
                      : "color-mix(in srgb, currentColor 12%, transparent)",
                  }}
                />
                <span className="font-mono text-[9px] text-zinc-400">
                  {i === 6 ? "今日" : Number(d.date.slice(8, 10))}
                </span>
              </div>
            ))}
          </div>

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
              1件チェックするごとに +{current.task_points}pt
              {checkedIn ? "" : "（チェックイン後に記録できます）"}
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-zinc-400">
            {current.done_count}/{total}
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
          <ul className="flex flex-col">
            {current.tasks.map((task) => (
              <li
                key={task.id}
                className="border-t border-zinc-100 py-2.5 first:border-t-0 dark:border-zinc-800/70"
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.done}
                    disabled={!checkedIn || pendingTaskId === task.id}
                    onChange={(e) => doToggle(task.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-green)] disabled:opacity-40"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm ${
                        task.done
                          ? "text-zinc-400 line-through"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {task.description}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
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
