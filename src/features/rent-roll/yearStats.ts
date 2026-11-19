/**
 * Pure helpers for the yearly rent roll (GET /rent-roll/year): the year param, cell tones / labels / tooltip text,
 * lease-end and renewal text, search, the chip filters and the property groups. No React here, so it is all tested.
 */
import { statusLabel } from "@/components/molecules/StatusBadge";
import { currentMonthUTC, EMPTY, formatCurrency, formatDate, isMonth, toCents, todayUTC } from "@/lib/format";
import type { RenewalAlert, RentRollYearCell, RentRollYearCellStatus, RentRollYearNextLease, RentRollYearResponse, RentRollYearRow } from "@/types/rentRoll";

/* ---------- Year ---------- */

/** The API's lowest year. */
export const MIN_YEAR = 2000;

/** This year in UTC: the API's default year. */
export function currentYearUTC(now = new Date()): number {
  return Number(todayUTC(now).slice(0, 4));
}

/** ?year=: 4 digits from 2000 to next UTC year (the API's range), else the current UTC year. */
export function yearFromParam(param: string | null | undefined, now = new Date()): number {
  const current = currentYearUTC(now);
  if (!param || !/^\d{4}$/.test(param)) return current;
  const year = Number(param);
  return year >= MIN_YEAR && year <= current + 1 ? year : current;
}

/** The Rent Roll's two views (?view=year; the month view has no param). */
export type RentRollView = "month" | "year";

/**
 * The URL params after switching view. Keeps the search (?q=) and anything unrelated; drops the other view's filters.
 * Month -> year: that month's year. Year -> month: the current UTC month in the current year, else January of that year.
 * `period` is the view's own value: "YYYY-MM" in the month view, "YYYY" in the year view.
 */
export function viewSwitchParams(prev: URLSearchParams, to: RentRollView, period: string, now = new Date()): URLSearchParams {
  const out = new URLSearchParams(prev);
  for (const key of ["view", "month", "year", "status", "sort", "page", "chips"]) out.delete(key);
  if (to === "year") {
    out.set("view", "year");
    out.set("year", period.slice(0, 4));
  } else {
    const thisMonth = currentMonthUTC(now);
    out.set("month", period.slice(0, 4) === thisMonth.slice(0, 4) ? thisMonth : `${period.slice(0, 4)}-01`);
  }
  return out;
}

/* ---------- Cells ---------- */

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10" -> "Oct 2026". Invalid -> "-". */
export function shortMonthYear(month: string): string {
  return isMonth(month) ? `${SHORT_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : EMPTY;
}

/** "2026-10" -> "Oct" (column headers). */
export function shortMonth(month: string): string {
  return isMonth(month) ? SHORT_MONTHS[Number(month.slice(5, 7)) - 1]! : EMPTY;
}

/** Friendly cell labels (legend, tooltips, screen readers). The rent statuses reuse StatusBadge's labels. */
export const cellStatusLabels: Record<RentRollYearCellStatus, string> = {
  PAID: statusLabel.rent.PAID,
  PARTIAL: statusLabel.rent.PARTIAL,
  UNPAID: statusLabel.rent.UNPAID,
  OVERDUE: statusLabel.rent.OVERDUE,
  NOT_BILLED: statusLabel.rent.NOT_BILLED,
  FUTURE: "Not billed yet",
  VACANT: "Vacant",
  OUTSIDE_LEASE: "Outside lease",
};

/** Legend order: money first, then the muted kinds. */
export const CELL_STATUSES: RentRollYearCellStatus[] = ["PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED", "FUTURE", "VACANT", "OUTSIDE_LEASE"];

/**
 * Status -> theme classes. `cell`: the table cell / strip square (background + text). `swatch`: the legend square.
 * Only theme tokens (the soft tokens have their own dark values), so light and dark both work.
 */
export const cellTone: Record<RentRollYearCellStatus, { cell: string; swatch: string }> = {
  PAID: { cell: "bg-success-soft text-text-primary", swatch: "bg-success-soft border-success" },
  PARTIAL: { cell: "bg-warning-soft text-text-primary", swatch: "bg-warning-soft border-warning" },
  UNPAID: { cell: "bg-danger-soft text-text-primary", swatch: "bg-danger-soft border-danger" },
  OVERDUE: { cell: "bg-danger-soft text-danger font-semibold shadow-[inset_3px_0_0_var(--danger)]", swatch: "bg-danger-soft border-danger border-l-4" },
  NOT_BILLED: { cell: "bg-surface-2 text-text-secondary", swatch: "bg-surface-2 border-border-strong" },
  FUTURE: { cell: "text-text-muted", swatch: "bg-surface-1 border-border-subtle" },
  VACANT: { cell: "bg-surface-3 text-text-muted", swatch: "bg-surface-3 border-border-strong border-dashed" },
  OUTSIDE_LEASE: { cell: "text-text-muted", swatch: "bg-surface-1 border-border-subtle border-dashed" },
};

/** Statuses that carry money (the others are "0.00" or not billed). */
const MONEY_STATUSES = new Set<RentRollYearCellStatus>(["PAID", "PARTIAL", "UNPAID", "OVERDUE"]);

/**
 * What a desktop cell shows: the paid amount, "Vacant" ("Reserved" on a reserved unit's row), or null (render a Dash).
 * Not-billed months show only money actually paid.
 */
export function cellDisplay(cell: RentRollYearCell, reserved = false): string | null {
  if (cell.status === "VACANT") return reserved ? "Reserved" : "Vacant";
  if (cell.status === "OUTSIDE_LEASE") return null;
  if (MONEY_STATUSES.has(cell.status)) return formatCurrency(cell.paid);
  return toCents(cell.paid) !== 0 ? formatCurrency(cell.paid) : null;
}

/**
 * Tooltip and screen-reader text, e.g. "Oct 2026 · Paid $1,000.00 of $2,850.00 · Balance $1,850.00 · Partial".
 * Balance only when not zero; vacant (or reserved) and outside-lease months name what they are. OVERDUE is balance-based
 * (an older month can still be owed), so it says so.
 */
export function cellDescription(cell: RentRollYearCell, reserved = false): string {
  const month = shortMonthYear(cell.month);
  switch (cell.status) {
    case "VACANT":
      return `${month} · ${reserved ? "Unit reserved" : "Unit vacant"}`;
    case "OUTSIDE_LEASE":
      return `${month} · Outside this lease`;
    case "FUTURE":
    case "NOT_BILLED": {
      const paid = toCents(cell.paid) !== 0 ? ` · Paid ${formatCurrency(cell.paid)}` : "";
      return `${month} · ${cellStatusLabels[cell.status]}${paid}`;
    }
    default: {
      const balance = toCents(cell.balance) !== 0 ? ` · Balance ${formatCurrency(cell.balance)}` : "";
      const status = cell.status === "OVERDUE" ? "Overdue · balance includes earlier months" : cellStatusLabels[cell.status];
      return `${month} · Paid ${formatCurrency(cell.paid)} of ${formatCurrency(cell.charged)}${balance} · ${status}`;
    }
  }
}

/** The table cell / strip classes for a month: its status background and text colour. */
export function monthCellClass(cell: RentRollYearCell | undefined): string | undefined {
  return cell ? cellTone[cell.status].cell : undefined;
}

/* ---------- Lease end and renewal ---------- */

/** True when the row's lease is over: alert ENDED, status ENDED / TERMINATED, or a negative day count. */
export function isLeaseEnded(row: Pick<RentRollYearRow, "lease" | "renewalAlert" | "daysToLeaseEnd">): boolean {
  if (!row.lease) return false;
  return row.renewalAlert === "ENDED" || row.lease.status !== "ACTIVE" || (row.daysToLeaseEnd !== null && row.daysToLeaseEnd < 0);
}

/**
 * "Ends in 52 days" / "Ends tomorrow" / "Ends today", or "Ended Nov 30, 2026" once over. Never a negative number.
 * null for vacant rows and an active lease without an end date (render a Dash).
 */
export function daysToEndText(row: Pick<RentRollYearRow, "lease" | "renewalAlert" | "daysToLeaseEnd">): string | null {
  if (!row.lease) return null;
  if (isLeaseEnded(row)) return row.lease.endDate ? `Ended ${formatDate(row.lease.endDate)}` : "Ended";
  const days = row.daysToLeaseEnd;
  if (days === null) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

export const renewalAlertLabels: Record<RenewalAlert, string> = { ENDS_SOON: "Ends soon", ENDED: "Ended" };

/** Badge tone of the renewal alert: Ends soon warns, Ended is neutral (like an ENDED lease). */
export const renewalAlertTone: Record<RenewalAlert, "warning" | "neutral"> = { ENDS_SOON: "warning", ENDED: "neutral" };

/** "Renewed" / "Renewal drafted" (same tenant, DRAFT) / "Next tenant" (no tenant in common). */
export function renewalText(next: Pick<RentRollYearNextLease, "status" | "sharesTenant">): string {
  if (!next.sharesTenant) return "Next tenant";
  return next.status === "DRAFT" ? "Renewal drafted" : "Renewed";
}

/** The lease page from the year view (Ledger tab for a row click); its back arrow and ✕ return to this year. */
export function yearLeasePath(leaseId: string, year: number, tab?: "ledger"): string {
  return `/leases/${encodeURIComponent(leaseId)}?${tab ? `tab=${tab}&` : ""}from=rent-roll&view=year&year=${year}`;
}

/* ---------- Rows, search and chips ---------- */

/**
 * A reserved unit (e.g. the owner's office): a VACANT_UNIT row whose unit is RESERVED now. Shown as "Reserved", not vacant:
 * its vacant months are hidden and it isn't counted by the Vacant chip.
 */
export function isReservedRow(row: Pick<RentRollYearRow, "kind" | "unit">): boolean {
  return row.kind === "VACANT_UNIT" && row.unit.status === "RESERVED";
}

/** The tenant cell's text: tenant names, or "Reserved" / "Vacant" on a unit row. */
export function rowTitle(row: Pick<RentRollYearRow, "kind" | "unit" | "lease">): string {
  if (row.lease) return tenantNames(row);
  return isReservedRow(row) ? "Reserved" : "Vacant";
}

/** The unit's vacant months as shown: none on a reserved row. */
export function shownVacantMonths(row: Pick<RentRollYearRow, "kind" | "unit" | "vacantMonths">): string[] {
  return isReservedRow(row) ? [] : row.vacantMonths;
}

/** Tenant names, primary first (the API's order), or "" on a vacant row. */
export function tenantNames(row: Pick<RentRollYearRow, "lease">): string {
  return row.lease?.tenants.map((t) => t.fullName).join(", ") ?? "";
}

/** A stable key: the lease, or the unit for a vacant row. */
export function yearRowKey(row: Pick<RentRollYearRow, "lease" | "unit">): string {
  return row.lease ? `lease-${row.lease.id}` : `unit-${row.unit.id}`;
}

/** The texts search looks in: each tenant, "Unit 4B", property, lease number, and "Vacant" / "Reserved" on unit rows. */
export function yearSearchText(row: RentRollYearRow): string[] {
  return [...(row.lease?.tenants.map((t) => t.fullName) ?? [rowTitle(row)]), `Unit ${row.unit.unitNumber}`, row.unit.property.name, row.lease?.leaseNumber ?? ""];
}

/** The toolbar chips, kept in ?chips= (comma separated). */
export type YearChip = "ends-soon" | "unpaid" | "vacant";

export const YEAR_CHIPS: YearChip[] = ["ends-soon", "unpaid", "vacant"];

export const yearChipLabels: Record<YearChip, string> = { "ends-soon": "Ends soon", unpaid: "Unpaid months", vacant: "Vacant" };

/** ?chips= -> the known chips in toolbar order (unknown values are dropped). */
export function chipsFromParam(param: string | null | undefined): YearChip[] {
  const values = new Set((param ?? "").split(","));
  return YEAR_CHIPS.filter((c) => values.has(c));
}

/** Any month PARTIAL, UNPAID or OVERDUE. */
export function hasUnpaidMonths(row: Pick<RentRollYearRow, "months">): boolean {
  return row.months.some((c) => c.status === "PARTIAL" || c.status === "UNPAID" || c.status === "OVERDUE");
}

/** A vacant-unit row, or a lease row whose unit was vacant some month. Reserved units don't count. */
export function hasVacancy(row: Pick<RentRollYearRow, "kind" | "unit" | "vacantMonths">): boolean {
  if (isReservedRow(row)) return false;
  return row.kind === "VACANT_UNIT" || row.vacantMonths.length > 0;
}

/** Every active chip must match (each one narrows the list). */
export function matchesChips(row: RentRollYearRow, chips: readonly YearChip[]): boolean {
  return chips.every((chip) =>
    chip === "ends-soon" ? row.renewalAlert === "ENDS_SOON" : chip === "unpaid" ? hasUnpaidMonths(row) : hasVacancy(row),
  );
}

/** Search (case-insensitive "contains" on any one text, like every other list) and chips together. */
export function filterYearRows(rows: RentRollYearRow[], search: string, chips: readonly YearChip[]): RentRollYearRow[] {
  const term = search.trim().toLowerCase();
  return rows.filter((r) => matchesChips(r, chips) && (!term || yearSearchText(r).some((text) => text.toLowerCase().includes(term))));
}

export type PropertyGroup = {
  property: { id: string; name: string };
  rows: RentRollYearRow[];
  /** From the API (all rows in scope, not only the filtered ones). */
  totals: RentRollYearResponse["propertyTotals"][number];
};

/**
 * The (filtered) rows by property, in propertyTotals order (name A→Z), keeping the API's row order.
 * Properties with no rows left after filtering are left out.
 */
export function groupByProperty(rows: RentRollYearRow[], propertyTotals: RentRollYearResponse["propertyTotals"]): PropertyGroup[] {
  const byProperty = new Map<string, RentRollYearRow[]>();
  for (const r of rows) {
    const list = byProperty.get(r.unit.property.id);
    if (list) list.push(r);
    else byProperty.set(r.unit.property.id, [r]);
  }
  return propertyTotals.flatMap((totals) => {
    const groupRows = byProperty.get(totals.property.id);
    return groupRows ? [{ property: totals.property, rows: groupRows, totals }] : [];
  });
}

/* ---------- Columns ---------- */

/** Optional desktop columns (the Columns menu), in table order. Unit / tenants, current rent, the months, Total and Renewal alert always show. */
export const YEAR_OPTIONAL_COLUMNS = [
  { key: "market", label: "Market rent" },
  { key: "start", label: "Lease start" },
  { key: "end", label: "Lease end" },
  { key: "deposit", label: "Deposit" },
  { key: "lateFees", label: "Late fees (charged)" },
  { key: "vacancy", label: "Vacancy months" },
  { key: "daysToEnd", label: "Days to lease end" },
  { key: "renewal", label: "Renewal" },
] as const;

export type YearOptionalColumn = (typeof YEAR_OPTIONAL_COLUMNS)[number]["key"];

export const YEAR_OPTIONAL_KEYS: YearOptionalColumn[] = YEAR_OPTIONAL_COLUMNS.map((c) => c.key);
