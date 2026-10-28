import * as React from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { EmptyState, InlineError } from "@/components/molecules/Feedback";
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

/**
 * Horizontal comparison bars (Property Performance, expenses by category). Values are labeled; `detail` adds a muted note
 * after the value ("26.2%"). Under md, and with `stacked`, the label and value share a line and the bar sits under them
 * (for narrow cards); otherwise label, bar and value are one row. `key` defaults to the label.
 */
export function HBarList({
  items,
  format = (n) => String(n),
  stacked,
  className,
}: {
  items: { key?: string; label: string; value: number; detail?: string }[];
  format?: (n: number) => string;
  stacked?: boolean;
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return (
    <ul className={cn("m-0 flex list-none flex-col p-0", stacked ? "gap-3" : "gap-3 md:gap-2", className)}>
      {items.map((it) => (
        <li key={it.key ?? it.label} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1", !stacked && "md:flex md:gap-4")}>
          <span className={cn("min-w-0 truncate text-small", !stacked && "md:w-44 md:shrink-0")} title={it.label}>{it.label}</span>
          <span className={cn("whitespace-nowrap text-right text-small tabular", !stacked && "md:order-last md:min-w-24 md:shrink-0")}>
            {format(it.value)}
            {it.detail && <span className="ml-2 text-text-secondary">{it.detail}</span>}
          </span>
          <div aria-hidden className={cn("col-span-2 h-2 overflow-hidden rounded-pill bg-surface-3", !stacked && "md:h-5 md:flex-1")}><div className="h-full rounded-pill bg-success" style={{ width: `${(it.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Bar chart and stacked bar (theme tokens only, light and dark) ---------- */

type ChartState = "loading" | "empty" | "error" | "ideal";
interface ChartStateProps {
  /** Default "ideal". */
  state?: ChartState;
  empty?: { title: string; description: string };
  error?: { title: string; description?: string; onRetry?: () => void };
}

/** Loading (skeleton of the same height), empty or error content for a chart; null when ideal. */
function chartStateView({ state = "ideal", empty, error }: ChartStateProps, height: number): React.ReactNode {
  if (state === "loading") return <Skeleton className="w-full" style={{ height }} />;
  if (state === "error") return <InlineError title={error?.title ?? "Couldn't load the chart"} description={error?.description} onRetry={error?.onRetry} />;
  if (state === "empty") {
    return (
      <EmptyState
        className="py-8"
        icon={<BarChart3 strokeWidth={1.5} />}
        title={empty?.title ?? "No data yet"}
        description={empty?.description ?? "There is nothing to show here yet."}
      />
    );
  }
  return null;
}

/** Tooltip box: shown on hover and keyboard focus of the parent `group`. Edge items align to their side so it stays inside the card. */
function ChartTooltip({ text, align }: { text: string; align: "start" | "center" | "end" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max max-w-56 rounded-control border border-border-subtle bg-overlay px-2.5 py-1.5 text-left text-caption text-text-primary shadow-overlay group-hover:block group-focus-visible:block",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
      )}
    >
      {text}
    </span>
  );
}

const alignAt = (i: number, n: number): "start" | "center" | "end" => (n > 2 && i < n / 3 ? "start" : n > 2 && i >= (2 * n) / 3 ? "end" : "center");

/** Enter / Space activate a focusable chart part that has a click action. */
const activateKeys = (action?: () => void) => (e: React.KeyboardEvent) => {
  if (action && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    action();
  }
};

/** A tick step of 1, 2 or 5 × 10^n, about a quarter of the max. Whole numbers only with `integer`. */
function niceStep(raw: number, integer: boolean): number {
  if (!(raw > 0)) return 1;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  return integer ? Math.max(1, Math.round(step)) : step;
}

export interface BarChartSeries {
  label: string;
  /** A theme color, e.g. "var(--success)". */
  color: string;
}

export interface BarChartDatum {
  key: string;
  /** Short axis label, e.g. "Oct". */
  label: string;
  /** Full label for the hidden table, e.g. "October 2026". Default `label`. */
  fullLabel?: string;
  /** One value per series, in series order. null draws no bar. Use integers (cents, counts) so no float math is needed. */
  values: (number | null)[];
}

export interface BarChartProps extends ChartStateProps {
  series: BarChartSeries[];
  data: BarChartDatum[];
  /** Text for one value (default tooltip and hidden table), e.g. cents -> "$1,200.00". */
  formatValue: (value: number) => string;
  /** Y-axis tick text. Default `formatValue`. */
  formatTick?: (value: number) => string;
  /** Tooltip (and aria-label) for one group. Default "{label}: {series} {value} · ...". */
  tooltip?: (d: BarChartDatum) => string;
  /** Whole-number ticks only (counts). */
  integer?: boolean;
  /** Makes each group a button. */
  onBarClick?: (d: BarChartDatum) => void;
  /** Hidden table caption and figure label. */
  caption: string;
  /** First column header of the hidden table. Default "Month". */
  categoryLabel?: string;
  /** Plot height in px (the width always follows the card). Default 200. */
  height?: number;
  className?: string;
}

/**
 * Vertical bars, one group per category and one bar per series (grouped). One y-axis, light grid lines, thin bars with
 * rounded tops and 2px gaps, a legend only for 2+ series, a tooltip per group (hover and keyboard focus), a hidden table.
 * The width is fluid (CSS percentages, no fixed width); with more than 6 categories every other axis label hides on phones.
 */
export function BarChart({
  series,
  data,
  formatValue,
  formatTick = formatValue,
  tooltip,
  integer = false,
  onBarClick,
  caption,
  categoryLabel = "Month",
  height = 200,
  className,
  ...stateProps
}: BarChartProps) {
  const stateView = chartStateView(stateProps, height + 28);
  if (stateView) return <div className={className}>{stateView}</div>;

  const max = Math.max(0, ...data.flatMap((d) => d.values.map((v) => v ?? 0)));
  const step = niceStep(max / 4, integer);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let i = 0; i * step <= top; i++) ticks.push(i * step);
  const pctOf = (v: number) => (v / top) * 100;
  const tip =
    tooltip ??
    ((d: BarChartDatum) => `${d.fullLabel ?? d.label}: ${series.map((s, i) => `${s.label} ${d.values[i] === null ? "-" : formatValue(d.values[i] as number)}`).join(" · ")}`);
  const sparse = data.length > 6;

  return (
    <figure aria-label={caption} className={cn("m-0 flex flex-col gap-3", className)}>
      {series.length >= 2 && (
        <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-caption text-text-secondary">
          {series.map((s) => (
            <li key={s.label} className="inline-flex items-center gap-1.5">
              <i aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        {/* Y-axis labels */}
        <div aria-hidden className="relative w-12 shrink-0 text-right text-caption tabular text-text-secondary" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2 whitespace-nowrap" style={{ bottom: `${pctOf(t)}%` }}>
              {formatTick(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.slice(1).map((t) => (
              <div key={t} aria-hidden className="absolute inset-x-0 border-t border-border-strong" style={{ bottom: `${pctOf(t)}%` }} />
            ))}
            <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-text-muted" />
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const text = tip(d);
                const click = onBarClick ? () => onBarClick(d) : undefined;
                return (
                  <div
                    key={d.key}
                    role={click ? "button" : "img"}
                    tabIndex={0}
                    aria-label={text}
                    onClick={click}
                    onKeyDown={activateKeys(click)}
                    className={cn(
                      "group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-badge px-0.5 outline-none focus-visible:focus-ring sm:px-1.5",
                      click && "cursor-pointer",
                    )}
                  >
                    {d.values.map((v, si) =>
                      v === null ? null : (
                        <div
                          key={si}
                          className="w-full max-w-3.5 rounded-t-[3px] transition-[height] duration-draw ease-out group-hover:opacity-80"
                          style={{ height: `${pctOf(v)}%`, minHeight: v > 0 ? 2 : 0, background: series[si]?.color }}
                        />
                      ),
                    )}
                    <ChartTooltip text={text} align={alignAt(i, data.length)} />
                  </div>
                );
              })}
            </div>
          </div>
          {/* X-axis labels */}
          <div aria-hidden className="flex pt-2 text-caption text-text-secondary">
            {data.map((d, i) => (
              <span key={d.key} className={cn("min-w-0 flex-1 whitespace-nowrap text-center", sparse && i % 2 === 1 && "max-sm:invisible")}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryLabel}</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.fullLabel ?? d.label}</th>
              {d.values.map((v, si) => (
                <td key={si}>{v === null ? "No data" : formatValue(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface StackedBarSegment {
  key: string;
  label: string;
  /** A count (whole number). */
  value: number;
  /** A theme color, e.g. "var(--success)". */
  color: string;
}

export interface StackedBarProps extends ChartStateProps {
  segments: StackedBarSegment[];
  /** Makes each bar part and legend item a button. */
  onSegmentClick?: (segment: StackedBarSegment) => void;
  /** Hidden table caption and figure label. */
  caption: string;
  /** First column header of the hidden table. Default "Status". */
  categoryLabel?: string;
  className?: string;
}

/** One horizontal bar split into parts (2px gaps), a legend with label, count and percent (never color alone), tooltips and a hidden table. */
export function StackedBar({ segments, onSegmentClick, caption, categoryLabel = "Status", className, ...stateProps }: StackedBarProps) {
  const stateView = chartStateView(stateProps, 72);
  if (stateView) return <div className={className}>{stateView}</div>;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const pct = (v: number) => `${(total > 0 ? (v / total) * 100 : 0).toFixed(1)}%`;
  const describe = (s: StackedBarSegment) => `${s.label}: ${s.value} (${pct(s.value)})`;
  const visible = segments.filter((s) => s.value > 0);

  return (
    <figure aria-label={caption} className={cn("m-0 flex flex-col gap-4", className)}>
      <div className="flex h-4 w-full gap-0.5">
        {visible.map((s, i) => {
          const click = onSegmentClick ? () => onSegmentClick(s) : undefined;
          return (
            <div
              key={s.key}
              role={click ? "button" : "img"}
              tabIndex={0}
              aria-label={describe(s)}
              onClick={click}
              onKeyDown={activateKeys(click)}
              className={cn(
                "group relative h-full min-w-1 outline-none first:rounded-l-pill last:rounded-r-pill hover:opacity-80 focus-visible:focus-ring",
                click && "cursor-pointer",
              )}
              style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
            >
              <ChartTooltip text={describe(s)} align={i === 0 ? "start" : i === visible.length - 1 ? "end" : "center"} />
            </div>
          );
        })}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-small">
        {segments.map((s) => {
          const body = (
            <>
              <span className="inline-flex items-center gap-2 text-text-secondary">
                <i aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="tabular text-text-primary">
                {s.value} · {pct(s.value)}
              </span>
            </>
          );
          return (
            <li key={s.key}>
              {onSegmentClick ? (
                <button
                  type="button"
                  onClick={() => onSegmentClick(s)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-badge px-1 py-1 text-left hover:bg-surface-3 focus-visible:focus-ring"
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 px-1 py-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{categoryLabel}</th>
            <th scope="col">Count</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              <td>{s.value}</td>
              <td>{pct(s.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
