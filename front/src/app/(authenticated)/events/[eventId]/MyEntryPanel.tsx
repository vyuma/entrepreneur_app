"use client";

import { useActionState } from "react";
import {
  applyToEvent,
  type EventActionResult,
  submitSlide,
  withdrawEntry,
} from "@/actions/event";
import { ENTRY_STATUS_INFO, type EventDetail } from "@/types/event";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] dark:border-zinc-700 dark:bg-zinc-950";

function Message({ state }: { state: EventActionResult | null }) {
  if (!state) return null;
  return (
    <p
      className="text-sm"
      style={{ color: state.ok ? "var(--brand-green)" : "var(--brand-orange)" }}
    >
      {state.message}
    </p>
  );
}

/** 申込フォームと、承認後のスライド提出をまとめたパネル。 */
export default function MyEntryPanel({ detail }: { detail: EventDetail }) {
  const { event, my_entry: entry } = detail;

  const [applyState, applyAction, applying] = useActionState<
    EventActionResult | null,
    FormData
  >(applyToEvent, null);
  const [slideState, slideAction, submitting] = useActionState<
    EventActionResult | null,
    FormData
  >(submitSlide, null);
  const [withdrawState, withdrawAction] = useActionState<
    EventActionResult | null,
    FormData
  >(withdrawEntry, null);

  // --- 未申込 ---
  if (!entry) {
    if (event.phase !== "entry") {
      return (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          申込受付は終了しています。
        </section>
      );
    }

    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          このイベントに申し込む
        </h2>
        <p className="mt-1 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          申込後に管理者が承認します。承認されたらスライドURLを提出してください。
        </p>

        <form action={applyAction} className="flex flex-col gap-3">
          <input type="hidden" name="event_id" value={event.id} />

          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            発表タイトル
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              placeholder="例: AIで家計簿を自動化する"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            概要（任意）
            <textarea
              name="summary"
              rows={3}
              placeholder="何を作ったか・どんな課題を解決するか"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            チーム名（任意）
            <input type="text" name="team_name" className={inputClass} />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={applying}
              className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              {applying ? "送信中..." : "申し込む"}
            </button>
            <Message state={applyState} />
          </div>
        </form>
      </section>
    );
  }

  // --- 申込済み ---
  const statusInfo = ENTRY_STATUS_INFO[entry.status];

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
          あなたの申込
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>

      <p className="mt-3 font-medium text-black dark:text-zinc-50">
        {entry.title}
      </p>
      {entry.summary && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {entry.summary}
        </p>
      )}

      {entry.status === "rejected" && (
        <p className="mt-3 text-sm" style={{ color: "var(--brand-orange)" }}>
          却下されました{entry.reject_reason ? `: ${entry.reject_reason}` : ""}
        </p>
      )}

      {entry.status === "pending" && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          管理者の承認をお待ちください。承認されるとスライドURLを提出できます。
        </p>
      )}

      {/* 承認後：スライド提出 */}
      {entry.status === "approved" && event.slide_required && (
        <form action={slideAction} className="mt-4 flex flex-col gap-2">
          <input type="hidden" name="event_id" value={event.id} />
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            スライド共有URL
            <input
              type="url"
              name="slide_url"
              required
              defaultValue={entry.slide_url ?? ""}
              placeholder="https://docs.google.com/presentation/..."
              className={inputClass}
            />
          </label>
          <p className="text-[11px] text-zinc-400">
            共有設定を「リンクを知っている全員が閲覧可」にしてから貼り付けてください。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="self-start rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--brand-green)" }}
            >
              {submitting
                ? "登録中..."
                : entry.slide_url
                  ? "URLを更新"
                  : "URLを提出"}
            </button>
            <Message state={slideState} />
          </div>
        </form>
      )}

      {/* 受付中のみ取り下げ可 */}
      {event.phase === "entry" && (
        <form action={withdrawAction} className="mt-4">
          <input type="hidden" name="event_id" value={event.id} />
          <button
            type="submit"
            onClick={(e) => {
              if (!window.confirm("申込を取り下げますか？")) e.preventDefault();
            }}
            className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
          >
            申込を取り下げる
          </button>
          <Message state={withdrawState} />
        </form>
      )}
    </section>
  );
}
