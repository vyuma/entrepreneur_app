"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SINGLE_SERIES } from "@/lib/chart-palette";
import type { MonthlyPoint } from "@/types/admin";
import { useDarkMode } from "../useChartMode";

type Datum = { period: string; label: string; value: number };

function toData(points: MonthlyPoint[]): Datum[] {
  return points.map((p) => ({
    period: p.period,
    // 2026-07 → 7月（1月のみ年を出して区切りを示す）
    label: p.period.endsWith("-01")
      ? `${p.period.slice(0, 4)}年`
      : `${Number(p.period.slice(5, 7))}月`,
    value: p.points,
  }));
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload?: Datum }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{d.period}</p>
      <p className="text-sm font-semibold tabular-nums text-black dark:text-zinc-50">
        {d.value.toLocaleString()}
        <span className="ml-0.5 text-xs font-normal">{unit}</span>
      </p>
    </div>
  );
}

const AXIS_LIGHT = "#a1a1aa";
const GRID_LIGHT = "#e4e4e7";
const GRID_DARK = "#27272a";

/** 月別の付与ポイント総量。単一系列なので凡例なし。 */
export function PointsTrend({ data }: { data: MonthlyPoint[] }) {
  const dark = useDarkMode();
  const color = dark ? SINGLE_SERIES.points.dark : SINGLE_SERIES.points.light;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={toData(data)}
        margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
      >
        <CartesianGrid
          vertical={false}
          stroke={dark ? GRID_DARK : GRID_LIGHT}
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: AXIS_LIGHT, fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: AXIS_LIGHT, fontSize: 11 }}
        />
        <Tooltip
          cursor={{ fill: dark ? "#ffffff10" : "#00000008" }}
          content={<ChartTooltip unit="pt" />}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 累積メンバー数の推移。単一系列なので凡例なし。 */
export function MembersTrend({ data }: { data: MonthlyPoint[] }) {
  const dark = useDarkMode();
  const color = dark ? SINGLE_SERIES.members.dark : SINGLE_SERIES.members.light;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={toData(data)}
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
          tick={{ fill: AXIS_LIGHT, fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tick={{ fill: AXIS_LIGHT, fontSize: 11 }}
        />
        <Tooltip content={<ChartTooltip unit="人" />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: color }}
          activeDot={{
            r: 5,
            strokeWidth: 2,
            stroke: dark ? "#18181b" : "#ffffff",
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
