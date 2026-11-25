/**
 * When a lease really ended (`endedOn`, `cancelledOn`): what to show, and the date rules of the End lease and Edit end date
 * forms (rules.md, Leases). No API import, so it is unit-testable.
 */
import { formatDate, parseDateOnly, todayISO, todayUTC } from "@/lib/format";
import type { Lease } from "@/types/lease";

/**
 * The date a lease's end shows and sorts by: the day it was cancelled, else the day it ended, else the planned end
 * (active leases, history-only leases, and leases ended before the API had `endedOn`).
 */
export function leaseEndDate(lease: Pick<Lease, "endDate" | "endedOn" | "cancelledOn">): string | null {
  return lease.cancelledOn ?? lease.endedOn ?? lease.endDate;
}

/** "Cancelled Nov 25, 2026". */
export const cancelledText = (cancelledOn: string) => `Cancelled ${formatDate(cancelledOn)}`;

/** ACTIVE with a start date after UTC today (the backend's today): ending it cancels it, the tenant never moved in. */
export function isNotStarted(lease: Pick<Lease, "status" | "startDate">, today = todayUTC()): boolean {
  return lease.status === "ACTIVE" && lease.startDate !== null && lease.startDate > today;
}

/** The name of the End action: "Cancel lease" for a lease that hasn't started. */
export function endActionLabel(lease: Pick<Lease, "status" | "startDate">): "Cancel lease" | "End lease" {
  return isNotStarted(lease) ? "Cancel lease" : "End lease";
}

/** The day it ended can be corrected: ENDED / TERMINATED, not cancelled, not history-only, and started (else the API answers 409). */
export function canEditEndDate(lease: Pick<Lease, "status" | "isHistorical" | "cancelledOn" | "startDate">, today = todayUTC()): boolean {
  const closed = lease.status === "ENDED" || lease.status === "TERMINATED";
  return closed && !lease.isHistorical && !lease.cancelledOn && !(lease.startDate && lease.startDate > today);
}

/** The End lease form's date: today, as the earlier of the local and UTC day (the API refuses later ones), never before the start. */
export function defaultEndedOn(startDate: string | null, now = new Date()): string {
  const local = todayISO(now);
  const utc = todayUTC(now);
  const today = local < utc ? local : utc;
  return startDate && startDate > today ? startDate : today;
}

/** The form's check, like the backend's: a real date from the start date to UTC today. null when it is fine. */
export function endedOnError(value: string, startDate: string | null, today = todayUTC()): string | null {
  if (!value) return "Choose the end date.";
  if (!parseDateOnly(value)) return "Use a full date.";
  if (value > today) return "The end date can't be after today.";
  if (startDate && value < startDate) return `The end date can't be before the start date (${formatDate(startDate)}).`;
  return null;
}

/**
 * A backend message about `endedOn` (400, shown under the field) with friendly names; null when it is about something else.
 * "endedOn must not be before startDate (2026-10-01)" -> "End date must not be before the start date (Oct 1, 2026)".
 */
export function endedOnServerError(message: string): string | null {
  if (!message.startsWith("endedOn")) return null;
  return message.replace(/^endedOn/, "End date").replace(/startDate \((\d{4}-\d{2}-\d{2})\)/, (_all, date: string) => `the start date (${formatDate(date)})`);
}

/**
 * Splits a failed save's messages: `field` goes under the date, `form` at the top ("" when there are none).
 * `friendly` renames the fields of the other messages; a 409 that names endedOn then says "the end date".
 */
export function splitEndedOnErrors(messages: string[], friendly: (message: string) => string = (m) => m): { field: string; form: string } {
  const field: string[] = [];
  const form: string[] = [];
  for (const m of messages) {
    const onField = endedOnServerError(m);
    if (onField) field.push(onField);
    else form.push(friendly(m).replace(/\bendedOn\b/g, "the end date"));
  }
  return { field: field.join(". "), form: form.join(" ") };
}
