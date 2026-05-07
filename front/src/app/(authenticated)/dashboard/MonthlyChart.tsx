"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyEntry = { year: number; month: number; minutes: number };

type Props = {
  data: MonthlyEntry[];
  currentYear: number;
  currentMonth: number;
};

type TooltipPayloadEntry = { value?: number | string; payload?: ChartDatum };

type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
};

type ChartDatum = {
  key: string;
  label: string;
  hours: number;
  minutes: number;
  isCurrent: boolean;
};

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  const h = Math.floor(datum.minutes / 60);
  const m = datum.minutes % 60;
  return (
    <div className="rounded-md bg-gradient-to-r from-[var(--brand-green)]/40 via-zinc-300 to-[var(--brand-orange)]/40 p-px shadow-sm dark:from-[var(--brand-green)]/30 dark:via-zinc-700 dark:to-[var(--brand-orange)]/30">
      <div className="rounded-[5px] bg-white px-2.5 py-1.5 dark:bg-zinc-900">
        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {datum.label}
        </p>
        <p className="text-sm font-semibold text-black tabular-nums dark:text-zinc-50">
          {h}h{m > 0 ? ` ${m}m` : ""}
        </p>
      </div>
    </div>
  );
}

export default function MonthlyChart({
  data,
  currentYear,
  currentMonth,
}: Props) {
  const chartData: ChartDatum[] = data.map((r) => ({
    key: `${r.year}-${r.month}`,
    label: `${r.year}/${r.month}`,
    hours: +(r.minutes / 60).toFixed(1),
    minutes: r.minutes,
    isCurrent: r.year === currentYear && r.month === currentMonth,
  }));

  return (
    <div className="h-48 w-full" style={{ minHeight: 0, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={192} minWidth={0}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            vertical={false}
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => `${v.split("/")[1]}月`}
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            className="text-zinc-500 dark:text-zinc-400"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}h`}
            width={32}
            className="text-zinc-500 dark:text-zinc-400"
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
          />
          <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((d) => (
              <Cell
                key={d.key}
                fill="currentColor"
                className={
                  d.isCurrent
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-300 dark:text-zinc-700"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
