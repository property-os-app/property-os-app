import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, Bar, Dash, Num } from "@/components/atoms";
import { SpreadsheetTable, type SheetColumn } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { formatCurrency, formatCurrencyShort, formatDate, formatMonth, toCents } from "@/lib/format";
import { plural, unitLabel } from "@/lib/labels";
import { linkFocus } from "@/features/shared/linkClass";
import { MonthCell } from "@/features/rent-roll/MonthCell";
import {
  cellTenants,
  collectedLabel,
  collectedPercent,
  collectedTone,
  daysToEndText,
  isCurrentMonth,
  isQuarterEnd,
  isReservedRow,
  leaseTenantLabel,
  monthCellClass,
  renewalAlertLabels,
  renewalAlertTone,
  renewalText,
  shortMonth,
  shortMonthYear,
  shownCell,
  shownVacantMonths,
  tenantColumnHeader,
  tenantNames,
  yearLeasePath,
  yearRowKey,
  type PropertyGroup,
  type YearOptionalColumn,
} from "@/features/rent-roll/yearStats";
import type { RentRollYearResponse, RentRollYearRow, RentRollYearRowsBy, RentRollYearTotals } from "@/types/rentRoll";

type YearColumn = SheetColumn<RentRollYearRow> & {
  /** What the subtotal / grand total row shows in this column (nothing when absent). */
  total?: (t: RentRollYearTotals) => ReactNode;
  /** Shown only when picked in the Columns menu. */
  optional?: YearOptionalColumn;
};

/** Short money ("$2,950"), the exact amount as a tooltip; a Dash when empty. */
const money = (value: string | null | undefined) => (value ? <Num title={formatCurrency(value)}>{formatCurrencyShort(value)}</Num> : <Dash />);

/**
 * Subtotal and total rows: the paid amount in short money; a small muted "of $charged" under it only when less than
 * charged was paid. The exact amounts are in the tooltip.
 */
function paidOfCharged(paid: string, charged: string) {
  const short = toCents(paid) < toCents(charged);
  return (
    <span className="inline-flex flex-col items-end py-1 leading-tight" title={`Paid ${formatCurrency(paid)} of ${formatCurrency(charged)}`}>
      <Num>{formatCurrencyShort(paid)}</Num>
      {short && <span className="text-caption font-normal text-text-muted">of {formatCurrencyShort(charged)}</span>}
    </span>
  );
}

/** "97%" with a tiny bar (tone by how much is missing); a Dash when nothing was charged. */
function Collected({ paid, charged }: { paid: string; charged: string }) {
  const pct = collectedPercent(paid, charged);
  if (pct === null) return <Dash />;
  return (
    <span className="flex items-center justify-end gap-2" title={`Collected ${formatCurrency(paid)} of ${formatCurrency(charged)} (${pct}%)`}>
      <Bar value={pct} tone={collectedTone(pct)} className="h-1.5 w-12" />
      <Num className="w-10 text-right">{collectedLabel(pct)}</Num>
    </span>
  );
}

/** The property band: name, unit count, "Collected $X of $Y · Z%" from propertyTotals. */
function propertyBand(g: PropertyGroup) {
  const pct = collectedPercent(g.totals.totalPaid, g.totals.totalCharged);
  return (
    <span className="flex flex-wrap items-baseline gap-x-3">
      <span>{g.property.name}</span>
      <span className="font-normal text-text-secondary">
        {plural(g.rows.length, "unit")} · Collected {formatCurrencyShort(g.totals.totalPaid)} of {formatCurrencyShort(g.totals.totalCharged)}
        {pct !== null && ` · ${pct}%`}
      </span>
    </span>
  );
}

export interface YearTableProps {
  data: RentRollYearResponse | undefined;
  groups: PropertyGroup[];
  year: number;
  /** "unit": one row per unit (its current tenant). "lease" (By tenant): one row per lease. */
  rowsBy?: RentRollYearRowsBy;
  visible: readonly string[];
  state: "ideal" | "loading" | "empty" | "error";
  empty: { title: string; description: string; action?: ReactNode };
  error: { title: string; description?: string; onRetry?: () => void };
  /** Under the table (the "totals include all units" note). */
  footer?: ReactNode;
  /** A row opens its lease (by unit: the current one); a vacant or reserved unit the Unit drawer. */
  onOpen: (row: RentRollYearRow) => void;
}

/**
 * The yearly grid on desktop (SpreadsheetTable), one row per unit or, By tenant, per lease (months outside it a muted "-"):
 * tenant and unit (sticky left), current rent, optional
 * lease columns, Jan–Dec (short paid amounts; colour only on problems; vacant striped; the current month tagged "Now",
 * outlined and scrolled into view on load; thin lines after Mar, Jun, Sep), Total paid (pinned right), optional late fees /
 * vacancy, the renewal alert, optional days to end / renewal, and Collected % with a tiny bar. All money is short, exact in
 * the tooltip. Property bands carry the API's collected totals; subtotal rows and the sticky grand total come from the API.
 * The page is the only vertical scroller (pageScroll): the header and total row stay in view, the sideways scrollbar sticks to the bottom.
 */
export function YearTable({ data, groups, year, rowsBy = "unit", visible, state, empty, error, footer, onOpen }: YearTableProps) {
  const months = data?.months ?? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const shown = new Set(visible);
  const nowMonth = months.find((m) => isCurrentMonth(m));

  const allColumns: YearColumn[] = [
    {
      key: "unit",
      header: tenantColumnHeader(rowsBy),
      minWidth: 220,
      cell: (r) => {
        const names = tenantNames(r);
        const reserved = isReservedRow(r);
        const label = r.lease ? `Open lease ${r.lease.leaseNumber}, ${names}` : `Open ${unitLabel(r.unit.unitNumber)}, ${reserved ? "reserved" : "vacant"}`;
        return (
          <div className="flex min-w-0 flex-col py-1.5">
            <button
              type="button"
              aria-label={label}
              title={r.lease ? `${names} · ${r.lease.leaseNumber}` : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(r);
              }}
              className={cn("max-w-[260px] truncate text-left font-semibold", linkFocus, r.lease ? "text-text-primary" : "text-text-muted")}
            >
              {r.lease ? leaseTenantLabel(r.lease, true) : reserved ? <Badge tone="neutral">Reserved</Badge> : "Vacant"}
            </button>
            <span className="text-small text-text-secondary">{unitLabel(r.unit.unitNumber)}</span>
          </div>
        );
      },
    },
    { key: "rent", header: "Current rent", align: "right", cell: (r) => money(r.lease?.rent) },
    { key: "market", optional: "market", header: "Market rent", align: "right", cell: (r) => money(r.unit.monthlyRent) },
    { key: "start", optional: "start", header: "Lease start", cell: (r) => (r.lease?.startDate ? formatDate(r.lease.startDate) : <Dash />) },
    { key: "end", optional: "end", header: "Lease end", cell: (r) => (r.lease?.endDate ? formatDate(r.lease.endDate) : <Dash />) },
    { key: "deposit", optional: "deposit", header: "Deposit", align: "right", cell: (r) => money(r.lease?.deposit) },
    ...months.map((m, i): YearColumn => {
      const now = isCurrentMonth(m);
      return {
        key: m,
        header: now ? (
          <span className="inline-flex items-center gap-1.5">
            {shortMonth(m)}
            <span className="rounded-pill bg-info-soft px-1.5 py-px text-caption font-semibold normal-case tracking-normal text-info">Now</span>
          </span>
        ) : (
          shortMonth(m)
        ),
        headerLabel: now ? `${formatMonth(m)}, this month` : formatMonth(m),
        align: "right",
        minWidth: now ? 112 : 92,
        className: "px-2",
        // Thin separators after Mar, Jun and Sep; the current month gets a soft outline down the whole column.
        columnClassName: cn(isQuarterEnd(i) && "border-r border-r-border-strong", now && "border-x border-x-info/50"),
        cell: (r) => {
          const raw = r.months[i];
          if (!raw) return <Dash />;
          const c = shownCell(r, raw);
          return <MonthCell cell={c} reserved={isReservedRow(r)} tenants={cellTenants(r, c)} />;
        },
        cellClassName: (r) => {
          const c = r.months[i];
          return monthCellClass(c && shownCell(r, c), isReservedRow(r));
        },
        total: (t) => (t.months[i] ? paidOfCharged(t.months[i].paid, t.months[i].charged) : null),
      };
    }),
    {
      key: "total",
      header: "Total paid",
      align: "right",
      minWidth: 120,
      sticky: "right",
      className: "font-semibold",
      cell: (r) => (
        <>
          <Num aria-hidden title={`Paid ${formatCurrency(r.totalPaid)} of ${formatCurrency(r.totalCharged)} charged`}>
            {formatCurrencyShort(r.totalPaid)}
          </Num>
          <span className="sr-only">
            Paid {formatCurrency(r.totalPaid)} of {formatCurrency(r.totalCharged)} charged in {year}
          </span>
        </>
      ),
      total: (t) => paidOfCharged(t.totalPaid, t.totalCharged),
    },
    {
      key: "lateFees",
      optional: "lateFees",
      header: "Late fees",
      align: "right",
      cell: (r) => (toCents(r.lateFees) !== 0 ? money(r.lateFees) : <Dash />),
      total: (t) => (toCents(t.lateFees) !== 0 ? money(t.lateFees) : <Dash />),
    },
    {
      key: "vacancy",
      optional: "vacancy",
      header: "Vacancy",
      align: "right",
      cell: (r) => {
        const vacant = shownVacantMonths(r);
        return vacant.length === 0 ? <Dash /> : <span title={vacant.map(shortMonthYear).join(", ")}>{plural(vacant.length, "month")}</span>;
      },
    },
    {
      key: "alert",
      header: "Renewal alert",
      cell: (r) => (r.renewalAlert ? <Badge tone={renewalAlertTone[r.renewalAlert]}>{renewalAlertLabels[r.renewalAlert]}</Badge> : <Dash />),
    },
    { key: "daysToEnd", optional: "daysToEnd", header: "Lease ends", cell: (r) => daysToEndText(r) ?? <Dash /> },
    {
      key: "renewal",
      optional: "renewal",
      header: "Renewal",
      cell: (r) =>
        r.nextLease ? (
          <Link
            to={yearLeasePath(r.nextLease.id, year)}
            state={{ from: "rent-roll" }}
            onClick={(e) => e.stopPropagation()}
            className={cn("font-semibold text-success hover:underline", linkFocus)}
            aria-label={`${renewalText(r.nextLease)}: open lease ${r.nextLease.leaseNumber}`}
          >
            {renewalText(r.nextLease)}
          </Link>
        ) : (
          <Dash />
        ),
    },
    {
      key: "collected",
      header: "Collected",
      align: "right",
      minWidth: 120,
      cell: (r) => <Collected paid={r.totalPaid} charged={r.totalCharged} />,
      total: (t) => <Collected paid={t.totalPaid} charged={t.totalCharged} />,
    },
  ];
  const columns = allColumns.filter((c) => !c.optional || shown.has(c.optional));

  const totalsRow = (label: string, t: RentRollYearTotals) => columns.map((c, i) => (i === 0 ? label : (c.total?.(t) ?? null)));

  return (
    <SpreadsheetTable<RentRollYearRow>
      caption={`Rent roll, ${year}`}
      columns={columns}
      groups={groups.map((g) => ({
        key: g.property.id,
        label: propertyBand(g),
        rows: g.rows,
        subtotal: totalsRow(`${g.property.name} total`, g.totals),
      }))}
      rowKey={yearRowKey}
      pageScroll
      scrollToColumn={nowMonth}
      onRowClick={onOpen}
      rowMuted={(r) => r.kind === "VACANT_UNIT"}
      totals={data ? totalsRow(`Total ${year}`, data.totals) : undefined}
      state={state}
      empty={empty}
      error={error}
      footer={footer}
    />
  );
}
