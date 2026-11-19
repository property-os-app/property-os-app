import type { ReactNode } from "react";
import { Link } from "react-router";
import { Badge, Dash, Num } from "@/components/atoms";
import { SpreadsheetTable, type SheetColumn } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatMonth, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import { linkFocus } from "@/features/shared/linkClass";
import { MonthCell } from "@/features/rent-roll/MonthCell";
import {
  daysToEndText,
  isReservedRow,
  monthCellClass,
  renewalAlertLabels,
  renewalAlertTone,
  renewalText,
  shortMonth,
  shortMonthYear,
  shownVacantMonths,
  tenantNames,
  yearLeasePath,
  yearRowKey,
  type PropertyGroup,
  type YearOptionalColumn,
} from "@/features/rent-roll/yearStats";
import type { RentRollYearResponse, RentRollYearRow, RentRollYearTotals } from "@/types/rentRoll";

type YearColumn = SheetColumn<RentRollYearRow> & {
  /** What the subtotal / grand total row shows in this column (nothing when absent). */
  total?: (t: RentRollYearTotals) => ReactNode;
  /** Shown only when picked in the Columns menu. */
  optional?: YearOptionalColumn;
};

const money = (value: string | null | undefined) => (value ? <Num>{formatCurrency(value)}</Num> : <Dash />);

/** Paid on top, "of $charged" under it (subtotal and total rows). */
function paidOfCharged(paid: string, charged: string) {
  return (
    <span className="inline-flex flex-col items-end py-1 leading-tight">
      <Num>{formatCurrency(paid)}</Num>
      <span className="text-caption font-normal text-text-secondary">of {formatCurrency(charged)}</span>
    </span>
  );
}

export interface YearTableProps {
  data: RentRollYearResponse | undefined;
  groups: PropertyGroup[];
  year: number;
  visible: readonly string[];
  state: "ideal" | "loading" | "empty" | "error";
  empty: { title: string; description: string; action?: ReactNode };
  error: { title: string; description?: string; onRetry?: () => void };
  /** Under the table (the "totals include all units" note). */
  footer?: ReactNode;
  /** A lease row opens the lease page; a vacant row the Unit drawer. */
  onOpen: (row: RentRollYearRow) => void;
}

/**
 * The yearly grid on desktop (SpreadsheetTable): unit / tenants (sticky), current rent, optional lease columns, Jan–Dec
 * (paid, coloured by status), Total, optional late fees / vacancy / days to end / renewal, and the renewal alert.
 * Rows grouped by property with the API's subtotals; the API's grand total sticks to the bottom.
 */
export function YearTable({ data, groups, year, visible, state, empty, error, footer, onOpen }: YearTableProps) {
  const months = data?.months ?? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const shown = new Set(visible);

  const allColumns: YearColumn[] = [
    {
      key: "unit",
      header: "Unit · Tenants",
      minWidth: 220,
      cell: (r) => {
        const names = tenantNames(r);
        const others = (r.lease?.tenants.length ?? 1) - 1;
        const reserved = isReservedRow(r);
        const label = r.lease ? `Open lease ${r.lease.leaseNumber}, ${names}` : `Open unit ${r.unit.unitNumber}, ${reserved ? "reserved" : "vacant"}`;
        return (
          <div className="flex min-w-0 flex-col py-1.5">
            <button
              type="button"
              aria-label={label}
              title={names || undefined}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(r);
              }}
              className={cn("max-w-[260px] truncate text-left font-semibold", linkFocus, r.lease ? "text-text-primary" : "text-text-muted")}
            >
              {r.lease ? `${r.lease.tenants[0]?.fullName ?? "No tenant"}${others > 0 ? ` +${others}` : ""}` : reserved ? <Badge tone="neutral">Reserved</Badge> : "Vacant"}
            </button>
            <span className="text-small text-text-secondary">
              Unit {r.unit.unitNumber}
              {r.lease && ` · ${r.lease.leaseNumber}`}
            </span>
          </div>
        );
      },
    },
    { key: "rent", header: "Current rent", align: "right", cell: (r) => money(r.lease?.rent) },
    { key: "market", optional: "market", header: "Market rent", align: "right", cell: (r) => money(r.unit.monthlyRent) },
    { key: "start", optional: "start", header: "Lease start", cell: (r) => (r.lease?.startDate ? formatDate(r.lease.startDate) : <Dash />) },
    { key: "end", optional: "end", header: "Lease end", cell: (r) => (r.lease?.endDate ? formatDate(r.lease.endDate) : <Dash />) },
    { key: "deposit", optional: "deposit", header: "Deposit", align: "right", cell: (r) => money(r.lease?.deposit) },
    ...months.map(
      (m, i): YearColumn => ({
        key: m,
        header: shortMonth(m),
        headerLabel: formatMonth(m),
        align: "right",
        minWidth: 104,
        className: "px-2",
        cell: (r) => (r.months[i] ? <MonthCell cell={r.months[i]} reserved={isReservedRow(r)} /> : <Dash />),
        cellClassName: (r) => monthCellClass(r.months[i]),
        total: (t) => (t.months[i] ? paidOfCharged(t.months[i].paid, t.months[i].charged) : null),
      }),
    ),
    {
      key: "total",
      header: "Total",
      align: "right",
      minWidth: 120,
      className: "font-semibold",
      cell: (r) => (
        <>
          <Num aria-hidden title={`Paid ${formatCurrency(r.totalPaid)} of ${formatCurrency(r.totalCharged)} charged`}>
            {formatCurrency(r.totalPaid)}
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
  ];
  const columns = allColumns.filter((c) => !c.optional || shown.has(c.optional));

  const totalsRow = (label: string, t: RentRollYearTotals) => columns.map((c, i) => (i === 0 ? label : (c.total?.(t) ?? null)));

  return (
    <SpreadsheetTable<RentRollYearRow>
      caption={`Rent roll, ${year}`}
      columns={columns}
      groups={groups.map((g) => ({
        key: g.property.id,
        label: `${g.property.name} · ${plural(g.rows.length, "row")}`,
        rows: g.rows,
        subtotal: totalsRow(`${g.property.name} total`, g.totals),
      }))}
      rowKey={yearRowKey}
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
