import type { ReactNode } from "react";
import { Dash, Skeleton } from "@/components/atoms";
import { KpiCard } from "@/components/molecules";
import { KpiRow } from "@/components/organisms";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { plural } from "@/lib/labels";
import { collectedPercent, yearSummary, type YearChip } from "@/features/rent-roll/yearStats";
import type { RentRollYearResponse } from "@/types/rentRoll";

export interface YearSummaryProps {
  data: RentRollYearResponse | undefined;
  year: number;
  isError: boolean;
  /** The count cards show their rows: turns that chip on. */
  onShow: (chip: YearChip) => void;
}

/**
 * The summary row above the yearly grid (KpiRow, 2 columns on phones): Collected in {year} (the API's totals, "of $charged"
 * and the %), vacant unit-months, leases ending soon and units with unpaid months. Counts cover every unit in scope (like the
 * totals, not the search / chips); the three count cards turn on their chip.
 */
export function YearSummary({ data, year, isError, onShow }: YearSummaryProps) {
  const kpi = (value: ReactNode) => (data ? value : isError ? <Dash /> : <Skeleton className="h-10 w-24" />);
  const counts = data ? yearSummary(data.rows) : null;
  const pct = data ? collectedPercent(data.totals.totalPaid, data.totals.totalCharged) : null;
  return (
    <KpiRow>
      <KpiCard
        label={`Collected in ${year}`}
        tone="success"
        value={kpi(<span title={data ? formatCurrency(data.totals.totalPaid) : undefined}>{formatCompactCurrency(data?.totals.totalPaid)}</span>)}
        delta={pct !== null ? { direction: "up", label: formatPercent(pct) } : undefined}
        note={data ? (pct === null ? "Nothing charged yet" : `of ${formatCompactCurrency(data.totals.totalCharged)} charged`) : undefined}
      />
      <KpiCard
        label="Vacant unit-months"
        value={kpi(counts?.vacantUnitMonths)}
        note={data ? "Months with no lease, up to this month" : undefined}
        onClick={counts?.vacantUnitMonths ? () => onShow("vacant") : undefined}
      />
      <KpiCard
        label="Leases ending soon"
        tone={counts?.endsSoon ? "warning" : "default"}
        value={kpi(counts?.endsSoon)}
        note={data ? "Within 60 days" : undefined}
        onClick={counts?.endsSoon ? () => onShow("ends-soon") : undefined}
      />
      <KpiCard
        label="Units with unpaid months"
        tone={counts?.unpaidUnits ? "danger" : "default"}
        value={kpi(counts?.unpaidUnits)}
        note={data ? (counts?.unpaidUnits ? `${plural(counts.unpaidUnits, "unit")} partial, unpaid or overdue` : "Every billed month paid") : undefined}
        onClick={counts?.unpaidUnits ? () => onShow("unpaid") : undefined}
      />
    </KpiRow>
  );
}
