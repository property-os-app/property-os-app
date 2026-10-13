/** Lease money and date helpers shared by the unit drawer, the tenants page and (later) the leases page. Money math in integer cents. */
import { daysUntil, formatDate, todayUTC, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import type { Lease } from "@/types/lease";

/** "Nov 1, 2026 to Oct 31, 2027"; null when both dates are missing (a missing one shows "-"). */
export function leasePeriod(lease: Lease): string | null {
  return lease.startDate || lease.endDate ? `${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}` : null;
}

/**
 * Where the lease stands on payments, by the backend's rule (UTC today, docs/API.md rent roll):
 * credit (balance < 0), none (nothing owed), overdue (oldest unpaid due date before today), today, or future.
 */
export type DueState =
  | { kind: "credit" }
  | { kind: "none" }
  | { kind: "overdue"; since: string }
  | { kind: "today" }
  | { kind: "future"; next: string };

export function dueState(lease: Lease, today = todayUTC()): DueState {
  const cents = toCents(lease.balance);
  if (cents < 0) return { kind: "credit" };
  const due = lease.oldestUnpaidDueDate;
  if (!due || cents === 0) return { kind: "none" };
  if (due < today) return { kind: "overdue", since: due };
  if (due === today) return { kind: "today" };
  return { kind: "future", next: due };
}

/** "Balance" card note. */
export function dueNote(state: DueState): string {
  switch (state.kind) {
    case "credit":
      return "Credit";
    case "none":
      return "Nothing owed";
    case "overdue":
      return `Overdue since ${formatDate(state.since)}`;
    case "today":
      return "Due today";
    case "future":
      return `Next due ${formatDate(state.next)}`;
  }
}

/** "Lease ends" card note: "Ending soon", "12 days left" (local calendar days), or "Past the end date". */
export function leaseEndsNote(lease: Lease): string {
  if (lease.endingSoon) return "Ending soon";
  const days = daysUntil(lease.endDate);
  if (days === null) return "";
  return days < 0 ? "Past the end date" : `${plural(days, "day")} left`;
}
