import {
  centsToAmount,
  currentMonthUTC,
  daysSince,
  formatCurrency,
  formatDate,
  formatMonth,
  formatShortDate,
  isMonth,
  todayUTC,
  toCents,
} from "@/lib/format";
import { paymentFrequencyLabels, plural } from "@/lib/labels";
import { firstRentDate } from "@/features/leases/stats";
import { billOnDate } from "@/features/settings/billing";
import type { PaymentTarget } from "@/features/ledger/RecordPaymentModal";
import type { Lease } from "@/types/lease";
import type { RentRollRow, RentRollStatus } from "@/types/rentRoll";

/** UPCOMING: NOT_BILLED rows the automatic billing skips (see billingKind). UI only, not a backend status. */
export type StatusFilter = "all" | RentRollStatus | "UPCOMING";

/** Segment order from the design, plus Upcoming (shown only when such rows exist). */
export const STATUS_FILTERS: StatusFilter[] = ["all", "PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED", "UPCOMING"];

/**
 * How the automatic billing treats a lease this month (API.md, Billing; no proration), in the backend's order:
 * not MONTHLY -> "not-monthly"; due date before the start -> "starts-late"; after the end -> "ends-early"; else "billable".
 */
export type BillingKind = "billable" | "starts-late" | "ends-early" | "not-monthly";

type BillingLease = Pick<Lease, "startDate" | "endDate" | "paymentFrequency">;

export function billingKind(dueDate: string | null, lease: BillingLease | undefined): BillingKind {
  if (!lease) return "billable";
  if (lease.paymentFrequency !== "MONTHLY") return "not-monthly";
  if (dueDate && lease.startDate && dueDate < lease.startDate) return "starts-late";
  if (dueDate && lease.endDate && dueDate > lease.endDate) return "ends-early";
  return "billable";
}

/** A NOT_BILLED row the automatic billing won't bill: its kind and the caption under the "Upcoming" badge. */
export interface UpcomingRow {
  kind: Exclude<BillingKind, "billable">;
  caption: string;
}

/**
 * Why a lease isn't billed this month: "Starts Oct 14 · first rent Nov 1", "Ended Oct 20 · no October rent due"
 * ("Ends" while the end date is still ahead), "Pays weekly · add charges by hand".
 */
export function upcomingCaption(kind: UpcomingRow["kind"], lease: Lease, month: string, today = todayUTC()): string {
  if (kind === "starts-late") return `Starts ${formatShortDate(lease.startDate)} · first rent ${formatShortDate(firstRentDate(lease.startDate, lease.rentDueDay))}`;
  if (kind === "ends-early") {
    const end = lease.endDate ?? "";
    return `${end < today ? "Ended" : "Ends"} ${formatShortDate(end)} · no ${formatMonth(month).split(" ")[0]} rent due`;
  }
  return `Pays ${paymentFrequencyLabels[lease.paymentFrequency].toLowerCase()} · add charges by hand`;
}

/** NOT_BILLED rows the automatic billing skips, by leaseId. Rows whose lease isn't in `leases` count as billable. */
export function upcomingRows(rows: RentRollRow[], leases: Lease[], month: string): Map<string, UpcomingRow> {
  const byId = new Map(leases.map((l) => [l.id, l]));
  const out = new Map<string, UpcomingRow>();
  for (const r of rows) {
    if (r.status !== "NOT_BILLED") continue;
    const lease = byId.get(r.leaseId);
    const kind = billingKind(r.dueDate, lease);
    if (lease && kind !== "billable") out.set(r.leaseId, { kind, caption: upcomingCaption(kind, lease, month) });
  }
  return out;
}

/** The row's segment: UPCOMING for skipped NOT_BILLED rows, else its status. */
export const rowFilterStatus = (r: RentRollRow, upcoming: Map<string, UpcomingRow> | null): Exclude<StatusFilter, "all"> =>
  upcoming?.has(r.leaseId) ? "UPCOMING" : r.status;

/** The ?month= value when it is a valid "YYYY-MM", else the current UTC month (the backend's default). */
export function monthFromParam(param: string | null): string {
  return isMonth(param) ? param : currentMonthUTC();
}

/** True for months before the current UTC month: the page is a snapshot of the month's last day. */
export function isPastMonth(month: string): boolean {
  return isMonth(month) && month < currentMonthUTC();
}

/** True for months after the current UTC month. */
export function isFutureMonth(month: string): boolean {
  return isMonth(month) && month > currentMonthUTC();
}

/**
 * Caption under Paid. Payments pay the oldest charges first, so up to openingBalance of `paid` went to earlier months:
 * "incl. $900.00 toward earlier balance". A row covered by a credit from before: "Covered by earlier credit". Else null.
 */
export function paidCaption(r: RentRollRow): string | null {
  const opening = toCents(r.openingBalance);
  const paid = toCents(r.paid);
  if (opening > 0 && paid > 0) return `incl. ${formatCurrency(centsToAmount(Math.min(paid, opening)))} toward earlier balance`;
  if (paid === 0 && opening < 0 && r.status === "PAID") return "Covered by earlier credit";
  return null;
}

/** Rows per segment (all rows of the month, before search). NOT_BILLED counts only rows the automatic billing will bill. */
export function statusCounts(rows: RentRollRow[], upcoming: Map<string, UpcomingRow> | null): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: rows.length, PAID: 0, PARTIAL: 0, UNPAID: 0, OVERDUE: 0, NOT_BILLED: 0, UPCOMING: 0 };
  for (const r of rows) counts[rowFilterStatus(r, upcoming)] += 1;
  return counts;
}

/** Same fields as the API search, except co-tenants (rows only carry the primary tenant). */
export const rowSearchText = (r: RentRollRow) => [r.leaseNumber, r.unit.unitNumber, `Unit ${r.unit.unitNumber}`, r.primaryTenant?.fullName];

/** Leases that owe something (balance > 0), for the Outstanding KPI chip. */
export const owingCount = (rows: RentRollRow[]) => rows.filter((r) => toCents(r.balance) > 0).length;

/**
 * Totals row over the visible rows, in integer cents. `billed`: rows that are not NOT_BILLED.
 * `owedCents` sums the positive balances (like the summary's `outstandingBalance`, so it matches the Outstanding KPI when
 * nothing is filtered); `creditCents` sums the credits (negative balances) as a positive number.
 */
export function rowTotals(rows: RentRollRow[]) {
  return rows.reduce(
    (t, r) => {
      const balance = toCents(r.balance);
      return {
        billed: t.billed + (r.status === "NOT_BILLED" ? 0 : 1),
        openingCents: t.openingCents + toCents(r.openingBalance),
        chargedCents: t.chargedCents + toCents(r.charged),
        paidCents: t.paidCents + toCents(r.paid),
        owedCents: t.owedCents + (balance > 0 ? balance : 0),
        creditCents: t.creditCents + (balance < 0 ? -balance : 0),
      };
    },
    { billed: 0, openingCents: 0, chargedCents: 0, paidCents: 0, owedCents: 0, creditCents: 0 },
  );
}

/**
 * Caption of a NOT_BILLED row (API.md, Billing; bill date = due date − billingLeadDays):
 * past month -> "Not billed · add rent by hand" (the automatic billing never bills earlier months);
 * no lead days (managers can't read the setting) -> "Due Nov 25 · bills automatically before then";
 * bill date ahead -> "Bills automatically on Nov 11"; bill date reached -> "Bills on the next daily run".
 */
export function notBilledCaption(dueDate: string | null, pastMonth: boolean, leadDays: number | null, today = todayUTC()): string {
  if (pastMonth) return "Not billed · add rent by hand";
  if (!dueDate) return "Not billed yet";
  if (leadDays === null) return `Due ${formatShortDate(dueDate)} · bills automatically before then`;
  const billOn = billOnDate(dueDate, leadDays);
  return billOn && billOn > today ? `Bills automatically on ${formatShortDate(billOn)}` : "Bills on the next daily run";
}

/**
 * "Status date" column: last payment (Paid, Partial), "{n} days overdue" ("Unpaid at month end" in a past month),
 * "Due {date}", or when the automatic billing bills it (notBilledCaption; `leadDays` null for managers).
 */
export function statusDate(
  r: RentRollRow,
  pastMonth = false,
  leadDays: number | null = null,
  today = todayUTC(),
): { text: string | null; tone: "danger" | "muted" | "default" } {
  switch (r.status) {
    case "PAID":
    case "PARTIAL":
      return { text: r.lastPaymentDate ? formatDate(r.lastPaymentDate) : null, tone: "default" };
    case "OVERDUE": {
      // A past month is a snapshot of its last day, so counting days to today would grow forever.
      if (pastMonth) return { text: "Unpaid at month end", tone: "danger" };
      // Overdue is decided on UTC today; the count uses local calendar days (daysSince, at least 1).
      return { text: `${plural(daysSince(r.oldestUnpaidDueDate), "day")} overdue`, tone: "danger" };
    }
    case "UNPAID":
      return { text: r.dueDate ? `Due ${formatDate(r.dueDate)}` : null, tone: "default" };
    case "NOT_BILLED":
      return { text: notBilledCaption(r.dueDate, pastMonth, leadDays, today), tone: "muted" };
  }
}

/** "{tenant}, Unit {n}, {property}". */
export const rowLabel = (r: RentRollRow) => `${r.primaryTenant?.fullName ?? "No tenant"}, Unit ${r.unit.unitNumber}, ${r.unit.property.name}`;

/** Record Payment choices from the month's rows (balance = the row's balance at month end). */
export const paymentTargets = (rows: RentRollRow[]): PaymentTarget[] =>
  rows.map((r) => ({ leaseId: r.leaseId, label: rowLabel(r), unitNumber: r.unit.unitNumber, balance: r.balance }));

/** What part of the month's payments went to older balances or ahead of this month's charges (integer cents). */
export interface CollectionBreakdown {
  towardEarlierCents: number;
  inAdvanceCents: number;
}

/**
 * Per row: towardEarlier = min(paid, max(openingBalance, 0)); inAdvance = max(0, paid - max(openingBalance, 0) - charged).
 * Summed over all rows of the month (not the filtered ones), so it matches `summary.collected`.
 */
export function collectionBreakdown(rows: RentRollRow[]): CollectionBreakdown {
  let towardEarlierCents = 0;
  let inAdvanceCents = 0;
  for (const r of rows) {
    const paid = toCents(r.paid);
    const owedBefore = Math.max(toCents(r.openingBalance), 0);
    towardEarlierCents += Math.min(paid, owedBefore);
    inAdvanceCents += Math.max(0, paid - owedBefore - toCents(r.charged));
  }
  return { towardEarlierCents, inAdvanceCents };
}

/** "Includes $200.00 toward earlier balances and $50.00 paid in advance" (non-zero parts only); null when both are 0. */
export function collectionNote({ towardEarlierCents, inAdvanceCents }: CollectionBreakdown): string | null {
  const parts = [
    towardEarlierCents > 0 ? `${formatCurrency(centsToAmount(towardEarlierCents))} toward earlier balances` : null,
    inAdvanceCents > 0 ? `${formatCurrency(centsToAmount(inAdvanceCents))} paid in advance` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `Includes ${parts.join(" and ")}` : null;
}
