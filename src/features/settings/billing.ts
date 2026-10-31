/** Automatic rent billing dates (API.md, Billing): rent is billed `billingLeadDays` before each lease's own due date (UTC days). */
import { addDaysISO, addMonthsYM, formatShortDate, todayUTC } from "@/lib/format";

/** Every value PATCH /settings/billing accepts. */
export const LEAD_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

/** The day rent due on `dueDate` gets billed: dueDate − leadDays ("YYYY-MM-DD"). */
export function billOnDate(dueDate: string, leadDays: number): string | null {
  return addDaysISO(dueDate, -leadDays);
}

/** "Due Nov 1 → billed Oct 18" for lead 14, using the 1st of next month (UTC) so the example is always ahead. */
export function leadDaysExample(leadDays: number, today = todayUTC()): string {
  const due = `${addMonthsYM(today.slice(0, 7), 1)}-01`;
  return `Due ${formatShortDate(due)} → billed ${formatShortDate(billOnDate(due, leadDays))}`;
}
