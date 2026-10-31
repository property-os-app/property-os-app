/** The lease wizard's end-date prefill from a template's defaultTermMonths (a hint; the server never applies it). */
import { termEndDate } from "@/features/leases/stats";

export interface TemplateEndInput {
  /** Start date in the form ("" or "YYYY-MM-DD"). */
  start: string;
  /** End date in the form now. */
  end: string;
  /** The end date this rule wrote last ("" when it hasn't). An end date different from it was set by hand (typed or a term button). */
  autoEnd: string;
  /** The picked template's defaultTermMonths; null or undefined when no template or no hint. */
  months: number | null | undefined;
}

/**
 * The end date to write, or null to leave the field alone: start + months − 1 day (2025-12-01 + 12 → 2026-11-30), only when
 * there is a start and a term, and the end date is empty or still the one this rule wrote. Run it when the template or the
 * start date changes.
 */
export function templateEndDate({ start, end, autoEnd, months }: TemplateEndInput): string | null {
  if (!start || !months) return null;
  if (end !== "" && end !== autoEnd) return null;
  const next = termEndDate(start, months);
  return next && next !== end ? next : null;
}
