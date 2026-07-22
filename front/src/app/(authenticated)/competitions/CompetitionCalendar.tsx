"use client";

import { useMemo, useState } from "react";
import type { Competition, InternalEvent } from "@/types/competition";

type Marker = {
  kind: "deadline" | "event" | "internal";
  label: string;
  url?: string;
};

const KIND_COLOR: Record<Marker["kind"], string> = {
  deadline: "var(--brand-orange)",
  event: "var(--brand-green)",
  internal: "var(--brand-blue)",
};

const KIND_LABEL: Record<Marker["kind"], string> = {
  deadline: "締切",
  event: "開催",
  internal: "自団体",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 開始〜終了の各日にマーカーを置く（終了日なしなら開始日のみ） */
function eachDay(startIso: string, endIso: string | null): string[] {
  const start = new Date(`${startIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  const end = endIso ? new Date(`${endIso.slice(0, 10)}T00:00:00`) : start;
  if (Number.isNaN(end.getTime()) || end < start) return [key(start)];

  const days: string[] = [];
  const cursor = new Date(start);
  // 暴走防止に最大62日
  while (cursor <= end && days.length < 62) {
    days.push(key(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export default function CompetitionCalendar({
  competitions,
  internalEvents,
}: {
  competitions: Competition[];
  internalEvents: InternalEvent[];
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<string | null>(key(today));

  const markers = useMemo(() => {
    const map = new Map<string, Marker[]>();
    const push = (day: string, marker: Marker) => {
      const list = map.get(day) ?? [];
      list.push(marker);
      map.set(day, list);
    };

    for (const c of competitions) {
      if (c.deadline_date) {
        for (const d of eachDay(c.deadline_date, null)) {
          push(d, {
            kind: "deadline",
            label: c.name ?? "コンペ",
            url: c.url,
          });
        }
      }
      if (c.event_date_date) {
        for (const d of eachDay(c.event_date_date, c.event_end_date)) {
          push(d, { kind: "event", label: c.name ?? "コンペ", url: c.url });
        }
      }
    }

    for (const e of internalEvents) {
      for (const d of eachDay(e.event_date, e.event_end_date)) {
        push(d, { kind: "internal", label: e.name });
      }
    }
    return map;
  }, [competitions, internalEvents]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];

  const selectedMarkers = selected ? (markers.get(selected) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ← 前の月
        </button>
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {year}年{month + 1}月
        </h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-full border border-zinc-300 px-3 py-1 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          次の月 →
        </button>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        {(Object.keys(KIND_COLOR) as Marker["kind"][]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: KIND_COLOR[k] }}
            />
            {KIND_LABEL[k]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[38rem] grid-cols-7 gap-px rounded-xl border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="bg-white py-2 text-center text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {w}
            </div>
          ))}

          {cells.map((day, i) => {
            if (!day) {
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: 空セルは位置そのものが識別子
                  key={`empty-${i}`}
                  className="min-h-[4.5rem] bg-white dark:bg-zinc-900"
                />
              );
            }
            const k = key(day);
            const dayMarkers = markers.get(k) ?? [];
            const isToday = k === key(today);
            const isSelected = k === selected;

            return (
              <button
                type="button"
                key={k}
                onClick={() => setSelected(k)}
                className={`min-h-[4.5rem] bg-white p-1.5 text-left align-top transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${
                  isSelected
                    ? "ring-1 ring-inset ring-[var(--brand-green)]"
                    : ""
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday
                      ? "font-semibold text-white"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                  style={
                    isToday
                      ? { backgroundColor: "var(--brand-green)" }
                      : undefined
                  }
                >
                  {day.getDate()}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {dayMarkers.slice(0, 6).map((m, idx) => (
                    <span
                      key={`${m.kind}-${idx}`}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: KIND_COLOR[m.kind] }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold text-black dark:text-zinc-50">
          {selected ?? "日付を選択"}
        </h3>
        {selectedMarkers.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            この日の予定はありません。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedMarkers.map((m, idx) => (
              <li
                key={`${m.kind}-${m.label}-${idx}`}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: KIND_COLOR[m.kind] }}
                />
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {KIND_LABEL[m.kind]}
                </span>
                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-zinc-700 hover:underline dark:text-zinc-300"
                  >
                    {m.label}
                  </a>
                ) : (
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    {m.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
