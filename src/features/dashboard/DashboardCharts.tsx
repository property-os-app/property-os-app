import { useNavigate } from "react-router";
import { Card, CardHeader } from "@/components/molecules";
import { BarChart, StackedBar, type StackedBarSegment } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";
import { plural, unitStatusLabels } from "@/lib/labels";
import type { Section } from "@/features/dashboard/hooks";
import { shortMonth, type BilledPoint, type UnitCounts } from "@/features/dashboard/stats";
import type { UnitStatus } from "@/types/unit";

/** Section state for a chart: loading, error (with Retry), empty or ideal. */
function chartState<T>(s: Section<T>, isEmpty: (data: T) => boolean) {
  return s.error ? "error" : s.isPending ? "loading" : isEmpty(s.data as T) ? "empty" : "ideal";
}

/** Cents -> "$1,200.00" / "$1.2K", through lib/format (no float sums). */
const money = (cents: number) => formatCurrency(centsToAmount(cents));
const moneyTick = (cents: number) => formatCompactCurrency(centsToAmount(cents));

/** Billed (grey, 4.95:1 light / 3.55:1 dark on the card) vs Collected (green), last 6 months. */
export function BilledCollectedChart({ billed }: { billed: Section<BilledPoint[]> }) {
  const points = billed.data ?? [];
  return (
    <Card as="section" aria-label="Rent billed vs. collected">
      <CardHeader description="Rent billed vs. collected" title="Last 6 months" />
      <BarChart
        caption="Rent billed and collected, last 6 months"
        series={[
          { label: "Billed", color: "var(--text-muted)" },
          { label: "Collected", color: "var(--success)" },
        ]}
        data={points.map((p) => ({ key: p.month, label: shortMonth(p.month), fullLabel: formatMonth(p.month), values: [p.billedCents, p.collectedCents] }))}
        tooltip={(d) => points.find((p) => p.month === d.key)?.tooltip ?? d.label}
        formatValue={money}
        formatTick={moneyTick}
        state={chartState(billed, (data) => data.every((p) => p.billedCents === null))}
        empty={{ title: "Nothing billed yet", description: "No rent was billed in the last 6 months." }}
        error={{ title: "Couldn't load the rent history", description: errorText(billed.error), onRetry: billed.retry }}
      />
    </Card>
  );
}

/** ACTIVE leases per end month, next 12 months, one sky-blue series. A bar opens /leases. */
export function ExpirationsChart({ expirations }: { expirations: Section<{ month: string; count: number }[]> }) {
  const navigate = useNavigate();
  return (
    <Card as="section" aria-label="Lease expirations">
      <CardHeader description="Lease expirations" title="Next 12 months" />
      <BarChart
        caption="Active leases ending per month, next 12 months"
        series={[{ label: "Leases ending", color: "var(--info)" }]}
        data={(expirations.data ?? []).map((e) => ({ key: e.month, label: shortMonth(e.month), fullLabel: formatMonth(e.month), values: [e.count] }))}
        tooltip={(d) => {
          const n = d.values[0] ?? 0;
          return `${plural(n, "lease")} ${n === 1 ? "ends" : "end"} in ${d.fullLabel ?? d.label}`;
        }}
        formatValue={(n) => String(n)}
        integer
        onBarClick={() => void navigate("/leases")}
        state={chartState(expirations, (data) => data.every((e) => e.count === 0))}
        empty={{ title: "No expirations ahead", description: "No leases end in the next 12 months." }}
        error={{ title: "Couldn't load leases", description: errorText(expirations.error), onRetry: expirations.retry }}
      />
    </Card>
  );
}

/** Same colors as the unit StatusBadges. */
const unitColors: Record<UnitStatus, string> = {
  OCCUPIED: "var(--success)",
  VACANT: "var(--text-muted)",
  RESERVED: "var(--info)",
  UNDER_MAINTENANCE: "var(--warning)",
};
const unitOrder: UnitStatus[] = ["OCCUPIED", "VACANT", "RESERVED", "UNDER_MAINTENANCE"];

/** One bar split by unit status, legend with counts and percents. A part or legend item opens /units. */
export function UnitsByStatusChart({ unitStatus }: { unitStatus: Section<UnitCounts> }) {
  const navigate = useNavigate();
  const counts = unitStatus.data;
  const segments: StackedBarSegment[] = counts ? unitOrder.map((s) => ({ key: s, label: unitStatusLabels[s], value: counts[s], color: unitColors[s] })) : [];
  return (
    <Card as="section" aria-label="Units by status">
      <CardHeader title="Units by status" description={counts ? plural(counts.total, "unit") : undefined} />
      <StackedBar
        caption="Units by status"
        segments={segments}
        onSegmentClick={() => void navigate("/units")}
        state={chartState(unitStatus, (c) => c.total === 0)}
        empty={{ title: "No units yet", description: "Add units to see their status here." }}
        error={{ title: "Couldn't load units", description: errorText(unitStatus.error), onRetry: unitStatus.retry }}
      />
    </Card>
  );
}
