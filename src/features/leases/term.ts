/** The Term card on the lease page (Details tab): badge, progress bar and the line under it, from the lease's dates and status. */
import { addMonthsISO, daysUntil, formatDate, todayISO, todayUTC } from "@/lib/format";
import { plural } from "@/lib/labels";
import { isOldLease, isPastEnd, pastEndText, wholeMonthsBetween } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

export interface TermParts {
  /** Whole months, end date included. */
  months: number;
  /** Days left over after the whole months. */
  days: number;
}

/** "2026-01-01" to "2026-12-31" -> 12 months, 0 days. null when a date is missing or the end isn't after the start. */
export function termParts(start: string | null, end: string | null, now = new Date()): TermParts | null {
  const toStart = daysUntil(start, now);
  const toEnd = daysUntil(end, now);
  if (!start || !end || toStart === null || toEnd === null || toEnd <= toStart) return null;
  const months = wholeMonthsBetween(start, end);
  const monthsEnd = daysUntil(addMonthsISO(start, months), now) ?? toStart;
  return { months, days: toEnd + 1 - monthsEnd };
}

/** "12-month fixed" for whole months, else "1 month, 12 days" or "12 days". null without both dates. */
export function termBadge(start: string | null, end: string | null): string | null {
  const parts = termParts(start, end);
  if (!parts) return null;
  if (parts.days === 0) return `${parts.months}-month fixed`;
  return [parts.months > 0 ? plural(parts.months, "month") : null, plural(parts.days, "day")].filter(Boolean).join(", ");
}

export interface TermView {
  badge: string | null;
  /** 0 to 100; null = no bar (old lease). */
  percent: number | null;
  /** Bar colour; "warning" also colours the text. */
  tone: "success" | "warning" | "neutral";
  /** The line under the bar; null = nothing to say. */
  text: string | null;
  /** A second line: the planned end of a lease that ended on another day. */
  note?: string;
}

/**
 * - Old lease: the dates only.
 * - DRAFT, or ACTIVE before its start: "Starts in N days", empty bar. A draft whose start passed: "Start date passed".
 * - ACTIVE: "Month 7 of 12 · 156 days left" (days as in the Lease ends tile: local calendar days).
 * - ACTIVE past the end date: the alert's past-end sentence, full warning bar.
 * - Cancelled: "Cancelled (never moved in) on {date}", empty bar.
 * - ENDED / TERMINATED: full neutral bar, "Ended on {endedOn}", and the planned end when it was another day.
 *   Leases ended before the API had `endedOn` only have their planned end date: "End date was {endDate}" ("is" while it is
 *   after today), for both statuses.
 */
export function termView(lease: Lease, now = new Date()): TermView {
  const { startDate, endDate } = lease;
  if (isOldLease(lease)) return { badge: null, percent: null, tone: "neutral", text: null };
  const badge = termBadge(startDate, endDate);
  const toStart = daysUntil(startDate, now);
  const toEnd = daysUntil(endDate, now);

  if (lease.cancelledOn) return { badge, percent: 0, tone: "neutral", text: `Cancelled (never moved in) on ${formatDate(lease.cancelledOn)}` };

  if (lease.status === "ENDED" || lease.status === "TERMINATED") {
    if (lease.endedOn) {
      const view: TermView = { badge, percent: 100, tone: "neutral", text: `Ended on ${formatDate(lease.endedOn)}` };
      if (endDate && lease.endedOn < endDate) view.note = `Ended early · planned end ${formatDate(endDate)}`;
      else if (endDate && lease.endedOn > endDate) view.note = `Planned end ${formatDate(endDate)}`;
      return view;
    }
    return { badge, percent: 100, tone: "neutral", text: `End date ${toEnd !== null && toEnd > 0 ? "is" : "was"} ${formatDate(endDate)}` };
  }

  if (lease.status === "DRAFT" || (toStart !== null && toStart > 0)) {
    let text: string | null = null;
    if (toStart !== null) text = toStart > 0 ? `Starts in ${plural(toStart, "day")}` : toStart === 0 ? "Starts today" : "Start date passed";
    return { badge, percent: 0, tone: "neutral", text };
  }

  const parts = termParts(startDate, endDate, now);
  // An ACTIVE lease always has both dates; this is only for safety.
  if (!parts || !startDate || toStart === null || toEnd === null) return { badge, percent: 0, tone: "neutral", text: null };
  if (isPastEnd(lease, todayUTC(now)) || toEnd < 0) return { badge, percent: 100, tone: "warning", text: pastEndText(lease, now) };

  // Rounded to the nearest month, so a term one day over a year is still "of 12".
  const total = Math.max(1, parts.months + (parts.days >= 15 ? 1 : 0));
  const today = todayISO(now);
  let month = 1;
  while (month < total && (addMonthsISO(startDate, month) ?? "9999-12-31") <= today) month += 1;
  const left = toEnd === 0 ? "ends today" : `${plural(toEnd, "day")} left`;
  return { badge, percent: (-toStart / (toEnd + 1 - toStart)) * 100, tone: "success", text: `Month ${month} of ${total} · ${left}` };
}
