import Link from "next/link";
import type { DashboardSummary } from "@/types/competition";

const CELLS = [
  { key: "challenge", label: "応募", color: "var(--brand-blue)" },
  { key: "wait", label: "結果待ち", color: "var(--brand-yellow)" },
  { key: "achieve", label: "成果", color: "var(--brand-green)" },
] as const;

export default function EntrySummaryCard({
  entries,
}: {
  entries: DashboardSummary["entries"];
}) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[var(--brand-blue)]/40 via-zinc-300 to-[var(--brand-green)]/40 p-px dark:from-[var(--brand-blue)]/30 dark:via-zinc-700 dark:to-[var(--brand-green)]/30">
      <div className="h-full rounded-[11px] bg-white p-5 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            応募状況
          </p>
          <Link
            href="/achievements"
            className="text-xs text-zinc-400 transition-colors hover:text-[var(--brand-green)]"
          >
            詳細 →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {CELLS.map((c) => (
            <Link
              key={c.key}
              href="/achievements"
              className="flex flex-col items-center gap-1 rounded-lg border border-zinc-100 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
            >
              <span
                className="text-2xl font-semibold tabular-nums"
                style={{ color: c.color }}
              >
                {entries[c.key]}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
