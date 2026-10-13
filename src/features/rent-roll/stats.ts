import { addMonthsYM, currentMonthUTC, daysUntil, formatDate, isMonth, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import type { PaymentTarget } from "@/features/ledger/RecordPaymentModal";
import type { RentRollRow, RentRollStatus } from "@/types/rentRoll";

export type StatusFilter = "all" | RentRollStatus;

/** Segment order from the design. */
export const STATUS_FILTERS: StatusFilter[] = ["all", "PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED"];

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

/** Rows per segment (all rows of the month, before search). */
export function statusCounts(rows: RentRollRow[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { all: rows.length, PAID: 0, PARTIAL: 0, UNPAID: 0, OVERDUE: 0, NOT_BILLED: 0 };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

/** Same fields as the API search, except co-tenants (rows only carry the primary tenant). */
export const rowSearchText = (r: RentRollRow) => [r.leaseNumber, r.unit.unitNumber, `Unit ${r.unit.unitNumber}`, r.primaryTenant?.fullName];

/** Leases that owe something (balance > 0), for the Outstanding KPI chip. */
export const owingCount = (rows: RentRollRow[]) => rows.filter((r) => toCents(r.balance) > 0).length;

/** Totals row over the visible rows, in integer cents. `billed`: rows that are not NOT_BILLED. */
export function rowTotals(rows: RentRollRow[]) {
  return rows.reduce(
    (t, r) => ({
      billed: t.billed + (r.status === "NOT_BILLED" ? 0 : 1),
      rentCents: t.rentCents + toCents(r.rent),
      paidCents: t.paidCents + toCents(r.paid),
      balanceCents: t.balanceCents + toCents(r.balance),
    }),
    { billed: 0, rentCents: 0, paidCents: 0, balanceCents: 0 },
  );
}

/** "Status date" column: last payment (Paid, Partial), "{n} days overdue", "Due {date}" or "Not billed yet". */
export function statusDate(r: RentRollRow): { text: string | null; tone: "danger" | "muted" | "default" } {
  switch (r.status) {
    case "PAID":
    case "PARTIAL":
      return { text: r.lastPaymentDate ? formatDate(r.lastPaymentDate) : null, tone: "default" };
    case "OVERDUE": {
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
