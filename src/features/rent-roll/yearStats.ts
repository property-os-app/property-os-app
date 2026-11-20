/**
 * Pure helpers for the yearly rent roll (GET /rent-roll/year, one row per unit or, "By tenant", per lease): the year and
 * rows params, the response check, cell tones / labels / tooltip text, the unit's leases (who a month belongs to, earlier tenants for the CSV), lease-end and renewal
 * text, search, the chip filters, the property groups and the Collected % / summary counts. No React here, so it is all tested.
 */
import { statusLabel } from "@/components/molecules/StatusBadge";
import { currentMonthUTC, EMPTY, formatCurrency, formatCurrencyShort, formatDate, isMonth, toCents, todayUTC } from "@/lib/format";
import type {
  RenewalAlert,
  RentRollYearCell,
  RentRollYearCellStatus,
  RentRollYearLease,
  RentRollYearNextLease,
  RentRollYearResponse,
  RentRollYearRow,
  RentRollYearRowsBy,
  RentRollYearUnitLease,
  RentRollYearUnitRow,
} from "@/types/rentRoll";
import { unitLabel } from "@/lib/labels";

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
  for (const key of ["view", "month", "year", "status", "sort", "page", "chips", "rows"]) out.delete(key);
  if (to === "year") {
    out.set("view", "year");
    out.set("year", period.slice(0, 4));
  } else {
    const thisMonth = currentMonthUTC(now);
    out.set("month", period.slice(0, 4) === thisMonth.slice(0, 4) ? thisMonth : `${period.slice(0, 4)}-01`);
  }
  return out;
}

/* ---------- Rows mode (?rows=) and the response check ---------- */

/** ?rows=lease -> "lease" ("By tenant"); anything else -> "unit" (the default, never written to the URL). */
export function rowsFromParam(param: string | null | undefined): RentRollYearRowsBy {
  return param === "lease" ? "lease" : "unit";
}

/** The URL after the By unit | By tenant switch: ?rows=lease, or no param for "unit" (the default). Keeps everything else. */
export function rowsSwitchParams(prev: URLSearchParams, rowsBy: RentRollYearRowsBy): URLSearchParams {
  const out = new URLSearchParams(prev);
  if (rowsBy === "lease") out.set("rows", "lease");
  else out.delete("rows");
  return out;
}

/** The first column's header: "Unit · Tenants" by unit, "Tenant · Unit" by tenant. */
export function tenantColumnHeader(rowsBy: RentRollYearRowsBy): string {
  return rowsBy === "lease" ? "Tenant · Unit" : "Unit · Tenants";
}

/** The switch labels. */
export const rowsByLabels: Record<RentRollYearRowsBy, string> = { unit: "By unit", lease: "By tenant" };

/** A unit row (rows=unit: it has `leases` and merged cells) rather than a lease row. */
export function isUnitRow(row: RentRollYearRow): row is RentRollYearUnitRow {
  return "leases" in row;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isTotals = (v: unknown) => isObject(v) && Array.isArray(v.months) && typeof v.totalPaid === "string" && typeof v.totalCharged === "string";

/**
 * True when the response has the shape this page knows for the mode asked: `rowsBy` echoes it, 12 months, totals, and every
 * row has 12 cells (unit rows also `leases` and cells with `leaseIds`). An older backend fails this, so the page shows
 * "needs the latest backend" instead of crashing.
 */
export function isYearResponse(data: unknown, rowsBy: RentRollYearRowsBy): data is RentRollYearResponse {
  if (!isObject(data) || data.rowsBy !== rowsBy || !Array.isArray(data.months) || data.months.length !== 12) return false;
  if (!Array.isArray(data.rows) || !Array.isArray(data.propertyTotals) || !isTotals(data.totals) || !isObject(data.availableYears)) return false;
  if (!data.propertyTotals.every((t) => isTotals(t) && isObject(t.property))) return false;
  return data.rows.every((r: unknown) => {
    if (!isObject(r) || !isObject(r.unit) || !isObject(r.unit.property) || !Array.isArray(r.months) || r.months.length !== 12) return false;
    if (!r.months.every((c: unknown) => isObject(c) && typeof c.status === "string" && typeof c.paid === "string")) return false;
    if (rowsBy === "lease") return true;
    return Array.isArray(r.leases) && r.months.every((c: unknown) => isObject(c) && Array.isArray(c.leaseIds));
  });
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

/** Every cell status. */
export const CELL_STATUSES: RentRollYearCellStatus[] = ["PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED", "FUTURE", "VACANT", "OUTSIDE_LEASE"];

/** The legend's statuses ("Reserved" is added by the legend). Not billed, future and outside-lease months are just empty or "-" cells. */
export const LEGEND_STATUSES: RentRollYearCellStatus[] = ["PAID", "PARTIAL", "UNPAID", "OVERDUE", "VACANT"];

/** Light diagonal stripes from theme tokens (works in light and dark): vacant months, and reserved ones in another neutral shade. */
export const VACANT_STRIPES = "bg-[image:repeating-linear-gradient(135deg,var(--surface-3)_0_5px,transparent_5px_10px)]";
export const RESERVED_STRIPES = "bg-[image:repeating-linear-gradient(45deg,var(--border-strong)_0_2px,transparent_2px_7px)]";

/**
 * Status -> theme classes. `cell`: the table cell / strip square (background + text). `swatch`: the legend square.
 * Problems stand out (OVERDUE strongest, with a left marker; UNPAID red; PARTIAL amber); PAID is calm (a very light tint,
 * normal text, a stronger tint in dark mode so it stays faintly visible); NOT_BILLED / FUTURE / OUTSIDE_LEASE plain; VACANT striped. Theme tokens only, so light and dark both work.
 */
export const cellTone: Record<RentRollYearCellStatus, { cell: string; swatch: string }> = {
  PAID: { cell: "bg-success-soft/60 text-text-primary dark:bg-success-soft", swatch: "bg-success-soft border-success/50" },
  PARTIAL: { cell: "bg-warning-soft text-text-primary", swatch: "bg-warning-soft border-warning" },
  UNPAID: { cell: "bg-danger-soft text-danger", swatch: "bg-danger-soft border-danger" },
  OVERDUE: { cell: "bg-danger/20 text-danger font-semibold shadow-[inset_3px_0_0_var(--danger)]", swatch: "bg-danger/20 border-danger border-l-4" },
  NOT_BILLED: { cell: "text-text-muted", swatch: "bg-surface-1 border-border-subtle" },
  FUTURE: { cell: "text-text-muted", swatch: "bg-surface-1 border-border-subtle" },
  VACANT: { cell: `${VACANT_STRIPES} text-text-muted`, swatch: `${VACANT_STRIPES} border-border-strong` },
  OUTSIDE_LEASE: { cell: "text-text-muted", swatch: "bg-surface-1 border-border-subtle border-dashed" },
};

/** A reserved unit's months (its VACANT cells): stripes in another neutral shade. */
export const reservedTone = { cell: `${RESERVED_STRIPES} text-text-muted`, swatch: `${RESERVED_STRIPES} border-border-strong` };

/** The tone of one cell, with a reserved unit's VACANT months shown as Reserved. */
export function toneOf(cell: RentRollYearCell, reserved = false): { cell: string; swatch: string } {
  return reserved && cell.status === "VACANT" ? reservedTone : cellTone[cell.status];
}

/** Statuses that carry money (the others are "0.00" or not billed). */
const MONEY_STATUSES = new Set<RentRollYearCellStatus>(["PAID", "PARTIAL", "UNPAID", "OVERDUE"]);

/**
 * What a desktop cell shows: the paid amount in short money ("$2,000", "$2,150.50"), "" for an empty cell (vacant and
 * reserved months are stripes; future months stay empty unless something was paid), or null (render a Dash: outside the
 * lease, not billed).
 */
export function cellDisplay(cell: RentRollYearCell): string | null {
  if (cell.status === "VACANT") return "";
  if (cell.status === "OUTSIDE_LEASE") return null;
  if (MONEY_STATUSES.has(cell.status)) return formatCurrencyShort(cell.paid);
  if (toCents(cell.paid) !== 0) return formatCurrencyShort(cell.paid);
  return cell.status === "FUTURE" ? "" : null;
}

/**
 * Tooltip and screen-reader text, e.g. "Mar 2026 · John Smith · Paid $2,000.00 of $2,000.00 · Paid" (exact amounts).
 * `tenants`: who the month belongs to ("John Smith → Sarah Lee" when two leases share it; see `cellTenants`).
 * Balance only when not zero; vacant (or reserved) and outside-lease months name what they are. OVERDUE is balance-based
 * (an older month can still be owed), so it says so.
 */
export function cellDescription(cell: RentRollYearCell, opts: { reserved?: boolean; tenants?: string } = {}): string {
  const month = shortMonthYear(cell.month);
  const who = opts.tenants ? ` · ${opts.tenants}` : "";
  switch (cell.status) {
    case "VACANT":
      return `${month} · ${opts.reserved ? "Reserved" : "Vacant"}`;
    case "OUTSIDE_LEASE":
      return `${month} · No lease this month`;
    case "FUTURE":
    case "NOT_BILLED": {
      const paid = toCents(cell.paid) !== 0 ? ` · Paid ${formatCurrency(cell.paid)}` : "";
      return `${month}${who} · ${cellStatusLabels[cell.status]}${paid}`;
    }
    default: {
      const balance = toCents(cell.balance) !== 0 ? ` · Balance ${formatCurrency(cell.balance)}` : "";
      const status = cell.status === "OVERDUE" ? "Overdue · balance includes earlier months" : cellStatusLabels[cell.status];
      return `${month}${who} · Paid ${formatCurrency(cell.paid)} of ${formatCurrency(cell.charged)}${balance} · ${status}`;
    }
  }
}

/**
 * The cell as shown. By tenant, a lease row's VACANT month (the unit was empty) is outside that lease: a muted "-" like any
 * other month without it. Unit rows and vacant / reserved units keep their stripes.
 */
export function shownCell<C extends RentRollYearCell>(row: RentRollYearRow, cell: C): C {
  return !isUnitRow(row) && row.lease && cell.status === "VACANT" ? { ...cell, status: "OUTSIDE_LEASE" } : cell;
}

/** The table cell / strip classes for a month: its status background and text colour (reserved months striped). */
export function monthCellClass(cell: RentRollYearCell | undefined, reserved = false): string | undefined {
  return cell ? toneOf(cell, reserved).cell : undefined;
}

/** True for the current UTC month (the "Now" column). */
export function isCurrentMonth(month: string, now = new Date()): boolean {
  return month === currentMonthUTC(now);
}

/** A thin separator after Mar, Jun and Sep (month index 2, 5, 8). */
export function isQuarterEnd(index: number): boolean {
  return index === 2 || index === 5 || index === 8;
}

/* ---------- Leases of a unit row ---------- */

/** A lease's short name: its primary tenant (the API lists them primary first); with `withCount`, "+n" for co-tenants. */
export function leaseTenantLabel(lease: Pick<RentRollYearLease, "tenants">, withCount = false): string {
  const first = lease.tenants[0]?.fullName ?? "No tenant";
  const others = lease.tenants.length - 1;
  return withCount && others > 0 ? `${first} +${others}` : first;
}

/**
 * Who a month belongs to. Unit row: the primary tenant of each lease in the cell's leaseIds, oldest first ("John Smith →
 * Sarah Lee"). Lease row: its own tenant, in the months of that lease. "" when none.
 */
export function cellTenants(row: RentRollYearRow, cell: RentRollYearCell): string {
  if (!isUnitRow(row)) return row.lease && cell.status !== "VACANT" && cell.status !== "OUTSIDE_LEASE" ? leaseTenantLabel(row.lease) : "";
  const ids = "leaseIds" in cell && Array.isArray(cell.leaseIds) ? (cell.leaseIds as string[]) : [];
  return ids
    .map((id) => row.leases.find((l) => l.id === id))
    .filter((l): l is RentRollYearUnitLease => Boolean(l))
    .map((l) => leaseTenantLabel(l))
    .join(" → ");
}

/** "2026-01".."2026-04" -> "Jan–Apr"; one month -> "Mar"; none -> "". From the first to the last month given (terms are contiguous). */
export function monthRange(months: readonly string[]): string {
  const sorted = months.filter((m) => isMonth(m)).sort();
  if (sorted.length === 0) return "";
  const first = shortMonth(sorted[0]!);
  const last = shortMonth(sorted[sorted.length - 1]!);
  return first === last ? first : `${first}–${last}`;
}

/**
 * The unit's other leases in the year, split around the current one: `earlier` (listed before it, the API's oldest-first
 * order) and `later`. Leases with an empty monthsCovered (only listed for a balance carried from an earlier year) are left out.
 */
export function otherLeases(row: Pick<RentRollYearUnitRow, "lease" | "leases">): { earlier: RentRollYearUnitLease[]; later: RentRollYearUnitLease[] } {
  const current = row.lease ? row.leases.findIndex((l) => l.id === row.lease!.id) : row.leases.length;
  const earlier: RentRollYearUnitLease[] = [];
  const later: RentRollYearUnitLease[] = [];
  row.leases.forEach((l, i) => {
    if (i === current || l.monthsCovered.length === 0) return;
    (i < current ? earlier : later).push(l);
  });
  return { earlier, later };
}

/** "John Smith (Jan–Apr), Sarah Lee (Apr–Jun)" (the CSV's Earlier tenants column). */
export function tenantsWithMonths(leases: readonly RentRollYearUnitLease[]): string {
  return leases.map((l) => `${leaseTenantLabel(l)} (${monthRange(l.monthsCovered)})`).join(", ");
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

/** The current lease's tenant names, primary first (the API's order), or "" on a vacant row. */
export function tenantNames(row: Pick<RentRollYearRow, "lease">): string {
  return row.lease?.tenants.map((t) => t.fullName).join(", ") ?? "";
}

/** A stable key: the unit on a unit row (and a vacant unit), the lease on a lease row (a unit can have several). */
export function yearRowKey(row: RentRollYearRow): string {
  return !isUnitRow(row) && row.lease ? `lease-${row.lease.id}` : `unit-${row.unit.id}`;
}

/**
 * The texts search looks in: the tenants of the row's leases (a unit row: every lease of the year, earlier tenants too;
 * a lease row: its own), "Unit 4B", property, the lease numbers, and "Vacant" / "Reserved" on rows without a lease.
 */
export function yearSearchText(row: RentRollYearRow): string[] {
  const leases: RentRollYearLease[] = isUnitRow(row) && row.leases.length ? row.leases : row.lease ? [row.lease] : [];
  return [
    ...(leases.length ? leases.flatMap((l) => l.tenants.map((t) => t.fullName)) : [rowTitle(row)]),
    `${unitLabel(row.unit.unitNumber)}`,
    row.unit.property.name,
    ...leases.map((l) => l.leaseNumber),
  ];
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

/** A vacant unit (no lease in the year), or any VACANT month. Reserved units don't count. */
export function hasVacancy(row: Pick<RentRollYearRow, "kind" | "unit" | "months">): boolean {
  if (isReservedRow(row)) return false;
  return row.kind === "VACANT_UNIT" || row.months.some((c) => c.status === "VACANT");
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

/* ---------- Collected and the summary row ---------- */

/** Paid ÷ charged as a percentage with one decimal (integer cents, rounded half up), or null when nothing was charged. */
export function collectedPercent(paid: string, charged: string): number | null {
  const chargedCents = toCents(charged);
  const paidCents = toCents(paid);
  if (Number.isNaN(chargedCents) || Number.isNaN(paidCents) || chargedCents <= 0) return null;
  return Math.round((paidCents * 1000) / chargedCents) / 10;
}

/** "97%" for the Collected column: whole percent, rounded down below 100 so 99.6% never reads "100%". null -> "-". */
export function collectedLabel(percent: number | null): string {
  if (percent === null) return EMPTY;
  return `${percent >= 100 ? Math.round(percent) : Math.floor(percent)}%`;
}

/** The Collected bar's tone: all collected calm, a little short amber, more red. */
export function collectedTone(percent: number): "success" | "warning" | "danger" {
  return percent >= 100 ? "success" : percent >= 90 ? "warning" : "danger";
}

/**
 * The summary row's counts over every row in scope (not only the filtered ones, like the totals). Units are counted once
 * (by tenant a unit can have several rows, each with the same vacantMonths); leases ending soon per lease. Same in both modes.
 */
export function yearSummary(rows: readonly RentRollYearRow[]): { vacantUnitMonths: number; endsSoon: number; unpaidUnits: number } {
  const vacantByUnit = new Map<string, number>();
  const unpaid = new Set<string>();
  for (const r of rows) {
    vacantByUnit.set(r.unit.id, Math.max(vacantByUnit.get(r.unit.id) ?? 0, shownVacantMonths(r).length));
    if (hasUnpaidMonths(r)) unpaid.add(r.unit.id);
  }
  return {
    vacantUnitMonths: [...vacantByUnit.values()].reduce((sum, n) => sum + n, 0),
    endsSoon: rows.filter((r) => r.renewalAlert === "ENDS_SOON").length,
    unpaidUnits: unpaid.size,
  };
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

/* ---------- Older backend ---------- */

/** Shown instead of the grid when the response isn't a shape this page knows (see `isYearResponse`). */
export const OUTDATED_BACKEND_TITLE = "This page needs the latest backend.";
export const OUTDATED_BACKEND_DESCRIPTION = "Please update the backend.";
