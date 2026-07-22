"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATEGORICAL_DARK,
  CATEGORICAL_LIGHT,
  MAX_SERIES,
} from "@/lib/chart-palette";
import type { MemberTrend } from "@/types/admin";
import { useDarkMode } from "../useChartMode";

const AXIS = "#a1a1aa";
const GRID_LIGHT = "#e4e4e7";
const GRID_DARK = "#27272a";

type Row = { period: string; label: string } & Record<string, number | string>;

/**
 * メンバー別の月次ポイント推移。
 * 系列は上位 MAX_SERIES 名までに絞り、残りは「その他」に畳む
 * （色を無限に増やさないため）。色は user_id ではなく表示順に固定で割り当て、
 * 絞り込みで系列数が変わっても各メンバーの色は変わらない。
 */
export default function MemberTrendChart({
  trends,
}: {
  trends: MemberTrend[];
}) {
  const dark = useDarkMode();
  const palette = dark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const [showTable, setShowTable] = useState(false);

  const { series, rows } = useMemo(() => {
    const top = trends.slice(0, MAX_SERIES);
    const rest = trends.slice(MAX_SERIES);

    const names: { key: string; name: string; color: string }[] = top.map(
      (t, i) => ({
        key: t.user_id,
        name: t.name,
        color: palette[i],
      }),
    );
    if (rest.length > 0) {
      names.push({
        key: "__other",
        name: `その他 ${rest.length}名`,
        color: AXIS,
      });
    }

    const periods = top[0]?.monthly.map((m) => m.period) ?? [];
    const data: Row[] = periods.map((period, idx) => {
      const row: Row = {
        period,
        label: period.endsWith("-01")
          ? `${period.slice(0, 4)}年`
          : `${Number(period.slice(5, 7))}月`,
      };
      for (const t of top) {
        row[t.user_id] = t.monthly[idx]?.points ?? 0;
      }
      if (rest.length > 0) {
        row.__other = rest.reduce(
          (sum, t) => sum + (t.monthly[idx]?.points ?? 0),
          0,
        );
      }
      return row;
    });

    return { series: names, rows: data };
  }, [trends, palette]);

  if (series.length === 0 || rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-400">
        表示できるデータがまだありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 凡例は2系列以上で常設。色だけに頼らないよう名前を併記する */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.name}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="ml-auto text-xs text-zinc-400 underline-offset-2 hover:underline"
        >
          {showTable ? "グラフで見る" : "表で見る"}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="py-2 pr-3 font-medium text-zinc-500">
                  メンバー
                </th>
                {rows.map((r) => (
                  <th
                    key={r.period}
                    className="py-2 pr-3 text-right font-mono text-[11px] font-normal text-zinc-400"
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr
                  key={s.key}
                  className="border-b border-zinc-100 dark:border-zinc-800/70"
                >
                  <td className="flex items-center gap-1.5 py-2 pr-3 text-zinc-700 dark:text-zinc-300">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </td>
                  {rows.map((r) => (
                    <td
                      key={r.period}
                      className="py-2 pr-3 text-right tabular-nums text-zinc-600 dark:text-zinc-400"
                    >
                      {Number(r[s.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={rows}
            margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
          >
            <CartesianGrid
              vertical={false}
              stroke={dark ? GRID_DARK : GRID_LIGHT}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: AXIS, fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: AXIS, fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="mb-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {String(label)}
                    </p>
                    {payload.map((p) => {
                      const s = series.find((x) => x.key === p.dataKey);
                      return (
                        <p
                          key={String(p.dataKey)}
                          className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s?.color }}
                          />
                          {s?.name}
                          <span className="ml-auto pl-3 font-semibold tabular-nums">
                            {Number(p.value ?? 0)}pt
                          </span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: dark ? "#18181b" : "#ffffff",
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
