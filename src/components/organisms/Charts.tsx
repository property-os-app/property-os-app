import { cn } from "@/lib/cn";

/**
 * Dependency-free charts that follow the guideline palette:
 * income is always green, expenses always sky blue, the net line is text-primary.
 * Swap for Recharts in the app if you need tooltips; keep the same colors via tokens/chartPalette().
 */

export interface MonthPoint { label: string; income: number; expenses: number }

export interface IncomeExpenseChartProps {
  data: MonthPoint[];
  height?: number;
  className?: string;
  /** Format for the accessible table. */
  format?: (n: number) => string;
}

export function IncomeExpenseChart({ data, height = 220, className, format = (n) => `$${n.toFixed(1)}K` }: IncomeExpenseChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.income, d.expenses))) * 1.05 || 1;
  const w = 600;
  const pts = data.map((d, i) => `${Math.round(((i + 0.5) / data.length) * w)},${Math.round(height - ((d.income - d.expenses) / max) * (height - 20))}`).join(" ");
  return (
    <figure className={cn("m-0", className)}>
      <div className="mb-3 flex flex-wrap gap-4 text-caption text-text-secondary">
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-success" />Income</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-info" />Expenses</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-2.5 bg-text-primary" />Net cash flow</span>
      </div>
      <div className="relative">
        <div className="flex items-end justify-around gap-2 border-b border-border-subtle px-2" style={{ height }}>
          {data.map((d) => (
            <div key={d.label} className="flex h-full w-16 items-end justify-center gap-1">
              <div className="w-5 rounded-t bg-success transition-[height] duration-draw ease-out" style={{ height: `${(d.income / max) * 100}%` }} />
              <div className="w-5 rounded-t bg-info transition-[height] duration-draw ease-out" style={{ height: `${(d.expenses / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <svg aria-hidden viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <polyline points={pts} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex justify-around px-2 pt-2 text-caption text-text-muted">
        {data.map((d) => <span key={d.label} className="w-16 text-center">{d.label}</span>)}
      </div>
      <table className="sr-only">
        <caption>Income versus expenses by month</caption>
        <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{format(d.income)}</td><td>{format(d.expenses)}</td><td>{format(d.income - d.expenses)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

export interface DonutSlice { label: string; value: number; color?: string }

const defaultSeries = ["var(--success)", "var(--info)", "var(--warning)", "var(--danger)", "var(--text-secondary)"];

/** Category breakdown donut with a legend that includes the values (never color alone). */
export function DonutChart({ slices, centerLabel, centerSub, format = (n) => String(n), className }: { slices: DonutSlice[]; centerLabel: string; centerSub?: string; format?: (n: number) => string; className?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label={`${centerLabel} by category`}>
        <circle cx={80} cy={80} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={22} />
        {slices.map((s, i) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx={80} cy={80} r={r} fill="none" stroke={s.color ?? defaultSeries[i % defaultSeries.length]} strokeWidth={22} strokeDasharray={`${len} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" />;
          offset += len;
          return el;
        })}
        <text x={80} y={76} textAnchor="middle" fill="var(--text-primary)" fontSize={20} fontWeight={800} fontFamily="inherit">{centerLabel}</text>
        {centerSub && <text x={80} y={94} textAnchor="middle" fill="var(--text-secondary)" fontSize={11} fontFamily="inherit">{centerSub}</text>}
      </svg>
      <ul className="m-0 flex w-full list-none flex-col gap-2 p-0 text-small">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-sm" style={{ background: s.color ?? defaultSeries[i % defaultSeries.length] }} />{s.label}</span>
            <span className="tabular">{format(s.value)} · {((s.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal comparison bars (Property Performance). Values are labeled. */
export function HBarList({ items, format = (n) => String(n), className }: { items: { label: string; value: number }[]; format?: (n: number) => string; className?: string }) {
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <ul className={cn("m-0 flex list-none flex-col gap-2 p-0", className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-4">
          <span className="w-44 shrink-0 text-small">{it.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-pill bg-surface-3"><div className="h-full rounded-pill bg-success" style={{ width: `${(it.value / max) * 100}%` }} /></div>
          <span className="w-24 shrink-0 text-right text-small tabular">{format(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}
