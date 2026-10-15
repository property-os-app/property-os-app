import {
  addMonthsYM,
  centsToAmount,
  currentMonthUTC,
  dayInMonth,
  daysUntil,
  formatCurrency,
  formatDate,
  formatMonth,
  formatShortDate,
  isMonth,
  todayUTC,
  toCents,
} from "@/lib/format";
import { paymentFrequencyLabels, plural } from "@/lib/labels";
import { firstRentDate, primaryTenant } from "@/features/leases/stats";
import type { PaymentTarget } from "@/features/ledger/RecordPaymentModal";
import type { Lease } from "@/types/lease";
import type { RentRollRow, RentRollStatus } from "@/types/rentRoll";

/** UPCOMING: NOT_BILLED rows that Generate rent skips (see billingKind). UI only, not a backend status. */
export type StatusFilter = "all" | RentRollStatus | "UPCOMING";

/** Segment order from the design, plus Upcoming (shown only when such rows exist). */
export const STATUS_FILTERS: StatusFilter[] = ["all", "PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED", "UPCOMING"];

/**
 * How Generate rent treats a lease this month (API.md, POST /rent-roll/generate), in the backend's order:
 * not MONTHLY -> "not-monthly"; due date before the start -> "starts-late"; after the end -> "ends-early"; else "generatable".
 */
export type BillingKind = "generatable" | "starts-late" | "ends-early" | "not-monthly";

type BillingLease = Pick<Lease, "startDate" | "endDate" | "paymentFrequency">;

export function billingKind(dueDate: string | null, lease: BillingLease | undefined): BillingKind {
  if (!lease) return "generatable";
  if (lease.paymentFrequency !== "MONTHLY") return "not-monthly";
  if (dueDate && lease.startDate && dueDate < lease.startDate) return "starts-late";
  if (dueDate && lease.endDate && dueDate > lease.endDate) return "ends-early";
  return "generatable";
}

/** A NOT_BILLED row that Generate rent won't bill: its kind and the caption under the "Upcoming" badge. */
export interface UpcomingRow {
  kind: Exclude<BillingKind, "generatable">;
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

/** NOT_BILLED rows that Generate rent skips, by leaseId. Rows whose lease isn't in `leases` count as billable. */
export function upcomingRows(rows: RentRollRow[], leases: Lease[], month: string): Map<string, UpcomingRow> {
  const byId = new Map(leases.map((l) => [l.id, l]));
  const out = new Map<string, UpcomingRow>();
  for (const r of rows) {
    if (r.status !== "NOT_BILLED") continue;
    const lease = byId.get(r.leaseId);
    const kind = billingKind(r.dueDate, lease);
    if (lease && kind !== "generatable") out.set(r.leaseId, { kind, caption: upcomingCaption(kind, lease, month) });
  }
  return out;
}

/** The row's segment: UPCOMING for skipped NOT_BILLED rows, else its status. */
export const rowFilterStatus = (r: RentRollRow, upcoming: Map<string, UpcomingRow> | null): Exclude<StatusFilter, "all"> =>
  upcoming?.has(r.leaseId) ? "UPCOMING" : r.status;

/** "Sophia Nguyen (starts Oct 14, first rent Nov 1)": an ACTIVE lease Generate rent skips for the month. */
export interface SkippedLease {
  name: string;
  reason: string;
}

/**
 * ACTIVE leases overlapping `month` that Generate rent skips (not monthly, or due date outside the term), sorted by name.
 * Same rule as the backend, so it names the leases behind skippedNonMonthly + skippedOutsideTerm.
 */
export function skippedLeases(leases: Lease[], month: string, today = todayUTC()): SkippedLease[] {
  const first = `${month}-01`;
  const last = dayInMonth(month, 31);
  if (!last) return [];
  const out: SkippedLease[] = [];
  for (const l of leases) {
    if (l.status !== "ACTIVE" || !l.startDate || !l.endDate || l.startDate > last || l.endDate < first) continue;
    const due = l.rentDueDay !== null ? dayInMonth(month, l.rentDueDay) : null;
    const kind = billingKind(due, l);
    if (kind === "generatable") continue;
    // The row caption in toast form: "starts Oct 14, first rent Nov 1", "ended Oct 20, no October rent due", "pays weekly".
    const caption = upcomingCaption(kind, l, month, today);
    const reason = kind === "not-monthly" ? caption.split(" · ")[0] : caption.replace(" · ", ", ");
    out.push({ name: primaryTenant(l)?.fullName ?? l.leaseNumber, reason: reason.charAt(0).toLowerCase() + reason.slice(1) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The ?month= value when it is a valid "YYYY-MM", else the current UTC month (the backend's default). */
export function monthFromParam(param: string | null): string {
  return isMonth(param) ? param : currentMonthUTC();
}

/** The latest month the backend lets you generate rent for: next month (UTC). */
export function lastGeneratableMonth(): string {
  return addMonthsYM(currentMonthUTC(), 1);
}

/** Past months, the current month and next month (UTC). Later months get a 400 from POST /rent-roll/generate. */
export function canGenerateRent(month: string): boolean {
  return isMonth(month) && month <= lastGeneratableMonth();
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

/** Rows per segment (all rows of the month, before search). NOT_BILLED counts only rows Generate rent would bill. */
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
 * "Status date" column: last payment (Paid, Partial), "{n} days overdue" ("Unpaid at month end" in a past month),
 * "Due {date}" or "Not billed yet".
 */
export function statusDate(r: RentRollRow, pastMonth = false): { text: string | null; tone: "danger" | "muted" | "default" } {
  switch (r.status) {
    case "PAID":
    case "PARTIAL":
      return { text: r.lastPaymentDate ? formatDate(r.lastPaymentDate) : null, tone: "default" };
    case "OVERDUE": {
      // A past month is a snapshot of its last day, so counting days to today would grow forever.
      if (pastMonth) return { text: "Unpaid at month end", tone: "danger" };
      // Overdue is decided on UTC today; the count uses local calendar days, so it is at least 1.
      const days = Math.max(1, -(daysUntil(r.oldestUnpaidDueDate) ?? 1));
      return { text: `${plural(days, "day")} overdue`, tone: "danger" };
    }
    case "UNPAID":
      return { text: r.dueDate ? `Due ${formatDate(r.dueDate)}` : null, tone: "default" };
    case "NOT_BILLED":
      return { text: "Not billed yet", tone: "muted" };
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
