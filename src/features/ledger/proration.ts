/** Partial-month rent for a lease that starts or ends inside a month. All money math in integer cents. */
import { dayInMonth, formatMonth, formatShortDate, isMonth, toCents } from "@/lib/format";
import type { Lease } from "@/types/lease";

export interface RentProration {
  /** First and last day of the month the lease covers ("YYYY-MM-DD"). `from` is the later of the start and the 1st. */
  from: string;
  to: string;
  days: number;
  daysInMonth: number;
  fullCents: number;
  /** fullCents x days / daysInMonth, rounded to the nearest cent (half up), integer math only. */
  proratedCents: number;
  /** The month's due date (rentDueDay, clamped) is outside the term, so Generate rent skips this lease. */
  dueOutsideTerm: boolean;
}

/**
 * Proration for `month` ("YYYY-MM") when the lease starts or ends inside it. null when the lease covers the whole month,
 * doesn't touch it, or misses its dates or rent.
 */
export function rentProration(lease: Pick<Lease, "startDate" | "endDate" | "rent" | "rentDueDay">, month: string): RentProration | null {
  const { startDate: start, endDate: end } = lease;
  if (!start || !end || lease.rent === null || !isMonth(month)) return null;
  const first = `${month}-01`;
  const last = dayInMonth(month, 31)!;
  if (start > last || end < first) return null;
  const from = start > first ? start : first;
  const to = end < last ? end : last;
  if (from === first && to === last) return null;

  // Same month, so the day numbers give the day count.
  const daysInMonth = Number(last.slice(8));
  const days = Number(to.slice(8)) - Number(from.slice(8)) + 1;
  const fullCents = toCents(lease.rent);
  const proratedCents = Math.floor((fullCents * days * 2 + daysInMonth) / (daysInMonth * 2));
  const due = lease.rentDueDay !== null ? dayInMonth(month, lease.rentDueDay) : null;
  return { from, to, days, daysInMonth, fullCents, proratedCents, dueOutsideTerm: due === null || due < start || due > end };
}

/** "Monthly Rent - October 2026 (prorated, Oct 14–Oct 31)"; without proration the generated rent's description. */
export function rentDescription(month: string, p?: RentProration | null): string {
  const base = `Monthly Rent - ${formatMonth(month)}`;
  return p ? `${base} (prorated, ${formatShortDate(p.from)}–${formatShortDate(p.to)})` : base;
}
