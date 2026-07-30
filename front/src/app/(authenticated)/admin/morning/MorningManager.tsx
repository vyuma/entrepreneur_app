"use client";

import { useActionState } from "react";
import {
  type ActionResult,
  createMorningTask,
  createMorningTip,
  deleteMorningTask,
  deleteMorningTip,
  saveMorningSettings,
  updateMorningTask,
  updateMorningTip,
} from "@/actions/morning-admin";
import {
  type MorningSetting,
  type MorningTask,
  type MorningTip,
  minuteToTime,
} from "@/types/morning";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-blue)] dark:border-zinc-700 dark:bg-zinc-950";

function Message({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      className="text-sm"
      style={{
        color: state.ok ? "var(--brand-green)" : "var(--brand-orange)",
      }}
    >
      {state.message}
    </p>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
      {label}
      <input
        type="number"
        name={name}
        min={0}
        defaultValue={defaultValue}
        className={inputClass}
      />
      {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
    </label>
  );
}

/** 時間帯とポイントの設定 */
function SettingsForm({ setting }: { setting: MorningSetting }) {
  const [state, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(saveMorningSettings, null);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-orange)" }}
        />
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          朝活の時間帯とポイント
        </h2>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        時刻はすべて日本時間で判定されます。終了時刻が開始時刻より前の場合は
        日付をまたぐ時間帯として扱われます。
      </p>

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2 dark:text-zinc-300">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={setting.enabled}
            className="h-4 w-4 accent-[var(--brand-green)]"
          />
          朝活プログラムを有効にする
        </label>

        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          開始時刻
          <input
            type="time"
            name="start_at"
            required
            defaultValue={minuteToTime(setting.start_minute)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          終了時刻
          <input
            type="time"
            name="end_at"
            required
            defaultValue={minuteToTime(setting.end_minute)}
            className={inputClass}
          />
        </label>

        <NumberField
          label="チェックインの基礎ポイント"
          name="base_points"
          defaultValue={setting.base_points}
        />
        <NumberField
          label="タスク1件あたりのポイント"
          name="task_points"
          defaultValue={setting.task_points}
        />
        <NumberField
          label="連続ボーナス（1日あたり）"
          name="streak_bonus_per_day"
          defaultValue={setting.streak_bonus_per_day}
          hint="2日目から上乗せされます"
        />
        <NumberField
          label="連続ボーナスの上限"
          name="streak_bonus_max"
          defaultValue={setting.streak_bonus_max}
        />

        <div className="h-px bg-zinc-100 sm:col-span-2 dark:bg-zinc-800" />

        <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2 dark:text-zinc-300">
          <input
            type="checkbox"
            name="lucky_enabled"
            defaultChecked={setting.lucky_enabled}
            className="h-4 w-4 accent-[var(--brand-green)]"
          />
          ラッキーチャンスを有効にする
        </label>
        <p className="text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          連続が途切れた人が戻ってきた日のチェックインに、下の範囲から
          ランダムで救済ボーナスを上乗せします（初回の人は対象外）。
        </p>
        <NumberField
          label="ラッキーチャンス 下限pt"
          name="lucky_min_points"
          defaultValue={setting.lucky_min_points}
        />
        <NumberField
          label="ラッキーチャンス 上限pt"
          name="lucky_max_points"
          defaultValue={setting.lucky_max_points}
        />

        <div className="h-px bg-zinc-100 sm:col-span-2 dark:bg-zinc-800" />

        <NumberField
          label="朝活宣言の投稿ポイント"
          name="post_points"
          defaultValue={setting.post_points}
        />
        <label className="flex flex-col gap-1 text-xs text-zinc-500 sm:col-span-2 dark:text-zinc-400">
          朝活宣言の定型文
          <textarea
            name="post_template"
            rows={5}
            defaultValue={setting.post_template}
            className={inputClass}
          />
          <span className="text-[11px] text-zinc-400">
            使える置き換え: {"{name}"} 表示名 / {"{date}"} 日付 / {"{time}"}{" "}
            現在時刻 / {"{streak}"} 連続日数 / {"{tasks}"}{" "}
            未消化のやることリスト
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-orange)" }}
          >
            {pending ? "保存中..." : "設定を保存"}
          </button>
          <Message state={state} />
        </div>
      </form>
    </section>
  );
}

/** 朝にすべきことリストの追加・編集 */
function TaskSection({ tasks }: { tasks: MorningTask[] }) {
  const [createState, createAction, creating] = useActionState<
    ActionResult | null,
    FormData
  >(createMorningTask, null);
  const [updateState, updateAction] = useActionState<
    ActionResult | null,
    FormData
  >(updateMorningTask, null);
  const [deleteState, deleteAction] = useActionState<
    ActionResult | null,
    FormData
  >(deleteMorningTask, null);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-green)" }}
        />
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          朝にすべきことリスト（{tasks.length}件）
        </h2>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        並び順は数値の小さいものが上に出ます。無効にすると朝活ページから消えます。
      </p>

      <form
        action={createAction}
        className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_6rem_auto]"
      >
        <input
          type="text"
          name="title"
          required
          maxLength={120}
          placeholder="やること（例: 今日やる3つを書き出す）"
          className={inputClass}
        />
        <input
          type="text"
          name="description"
          placeholder="補足説明（任意）"
          className={inputClass}
        />
        <input
          type="number"
          name="sort_order"
          defaultValue={tasks.length}
          className={inputClass}
          aria-label="並び順"
        />
        <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            className="h-4 w-4 accent-[var(--brand-green)]"
          />
          有効
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-500 sm:col-span-4 dark:text-zinc-400">
          <input
            type="checkbox"
            name="complete_on_post"
            className="h-4 w-4 accent-[var(--brand-blue)]"
          />
          朝活宣言の投稿でクリアにする（手動チェックはできなくなります）
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
          <button
            type="submit"
            disabled={creating}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-green)" }}
          >
            {creating ? "追加中..." : "リストに追加"}
          </button>
          <Message state={createState ?? updateState ?? deleteState} />
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-400">まだ登録されていません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <form
                action={updateAction}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_5rem_auto_auto_auto]"
              >
                <input type="hidden" name="task_id" value={task.id} />
                <input
                  type="text"
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={task.title}
                  className={inputClass}
                />
                <input
                  type="text"
                  name="description"
                  defaultValue={task.description ?? ""}
                  placeholder="補足説明"
                  className={inputClass}
                />
                <input
                  type="number"
                  name="sort_order"
                  defaultValue={task.sort_order}
                  className={inputClass}
                  aria-label="並び順"
                />
                <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={task.is_active}
                    className="h-4 w-4 accent-[var(--brand-green)]"
                  />
                  有効
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    name="complete_on_post"
                    defaultChecked={task.complete_on_post}
                    className="h-4 w-4 accent-[var(--brand-blue)]"
                  />
                  投稿でクリア
                </label>
                <button
                  type="submit"
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  更新
                </button>
              </form>
              <form action={deleteAction} className="mt-1 text-right">
                <input type="hidden" name="task_id" value={task.id} />
                <button
                  type="submit"
                  onClick={(ev) => {
                    if (!window.confirm(`「${task.title}」を削除しますか？`))
                      ev.preventDefault();
                  }}
                  className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
                >
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 朝活のコツ（Tips）の追加・編集 */
function TipSection({ tips }: { tips: MorningTip[] }) {
  const [createState, createAction, creating] = useActionState<
    ActionResult | null,
    FormData
  >(createMorningTip, null);
  const [updateState, updateAction] = useActionState<
    ActionResult | null,
    FormData
  >(updateMorningTip, null);
  const [deleteState, deleteAction] = useActionState<
    ActionResult | null,
    FormData
  >(deleteMorningTip, null);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--brand-yellow)" }}
        />
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          朝活のコツ（{tips.length}件）
        </h2>
      </div>
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        朝活ページの下部にカードとして並びます。
      </p>

      <form action={createAction} className="mb-5 flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem_auto]">
          <input
            type="text"
            name="title"
            required
            maxLength={120}
            placeholder="コツの見出し"
            className={inputClass}
          />
          <input
            type="number"
            name="sort_order"
            defaultValue={tips.length}
            className={inputClass}
            aria-label="並び順"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked
              className="h-4 w-4 accent-[var(--brand-green)]"
            />
            有効
          </label>
        </div>
        <textarea
          name="body"
          required
          rows={3}
          placeholder="本文"
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={creating}
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand-blue)" }}
          >
            {creating ? "追加中..." : "Tips を追加"}
          </button>
          <Message state={createState ?? updateState ?? deleteState} />
        </div>
      </form>

      {tips.length === 0 ? (
        <p className="text-sm text-zinc-400">まだ登録されていません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tips.map((tip) => (
            <li
              key={tip.id}
              className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <form action={updateAction} className="flex flex-col gap-2">
                <input type="hidden" name="tip_id" value={tip.id} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_auto_auto]">
                  <input
                    type="text"
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={tip.title}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    name="sort_order"
                    defaultValue={tip.sort_order}
                    className={inputClass}
                    aria-label="並び順"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={tip.is_active}
                      className="h-4 w-4 accent-[var(--brand-green)]"
                    />
                    有効
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    更新
                  </button>
                </div>
                <textarea
                  name="body"
                  required
                  rows={3}
                  defaultValue={tip.body}
                  className={inputClass}
                />
              </form>
              <form action={deleteAction} className="mt-1 text-right">
                <input type="hidden" name="tip_id" value={tip.id} />
                <button
                  type="submit"
                  onClick={(ev) => {
                    if (!window.confirm(`「${tip.title}」を削除しますか？`))
                      ev.preventDefault();
                  }}
                  className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-orange)]"
                >
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MorningManager({
  setting,
  tasks,
  tips,
}: {
  setting: MorningSetting;
  tasks: MorningTask[];
  tips: MorningTip[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsForm setting={setting} />
      <TaskSection tasks={tasks} />
      <TipSection tips={tips} />
    </div>
  );
}
