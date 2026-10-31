/** The Expenses date range: presets from the local today, the KPI label and the month count (unit-tested). No Date math on "YYYY-MM-DD". */
import { addDaysISO, addMonthsISO, formatDate, formatShortDate, parseDateOnly } from "@/lib/format";

export type RangePreset = "ytd" | "this-month" | "last-month" | "this-quarter" | "last-12" | "last-year" | "custom";

export const rangePresetLabels: Record<RangePreset, string> = {
  ytd: "Year to date",
  "this-month": "This month",
  "last-month": "Last month",
  "this-quarter": "This quarter",
  "last-12": "Last 12 months",
  "last-year": "Last year",
  custom: "Custom range",
};

export const RANGE_PRESETS = Object.keys(rangePresetLabels) as RangePreset[];

export interface DateRange {
  from: string;
  to: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * The from / to of a preset for `today` (local "YYYY-MM-DD"). "custom" gives year to date (its starting values).
 * Year to date: Jan 1 → today. Last 12 months: the same day a year ago + 1 → today. Last year: Jan 1 → Dec 31.
 */
export function presetRange(preset: RangePreset, today: string): DateRange {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case "this-month":
      return { from: monthStart, to: today };
    case "last-month": {
      const from = addMonthsISO(monthStart, -1)!;
      return { from, to: addDaysISO(monthStart, -1)! };
    }
    case "this-quarter":
      return { from: `${y}-${pad2(Math.floor((m - 1) / 3) * 3 + 1)}-01`, to: today };
    case "last-12":
      return { from: addDaysISO(addMonthsISO(today, -12)!, 1)!, to: today };
    case "last-year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return { from: `${y}-01-01`, to: today };
  }
}

/** The range the page uses: the preset's, or the custom dates (swapped when from is after to; YTD when one is missing or invalid). */
export function resolveRange(preset: RangePreset, from: string, to: string, today: string): DateRange {
  if (preset !== "custom") return presetRange(preset, today);
  if (!parseDateOnly(from) || !parseDateOnly(to)) return presetRange("ytd", today);
  return from <= to ? { from, to } : { from: to, to: from };
}

/** The KPI wording: "year to date", "last month"…, or "Oct 1 – Oct 28, 2026" for a custom range. */
export function rangeLabel(preset: RangePreset, range: DateRange): string {
  if (preset !== "custom") return rangePresetLabels[preset].toLowerCase();
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${sameYear ? formatShortDate(range.from) : formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** Calendar months from..to, both counted (Jan 1 – Oct 28 = 10), like the summary's averageMonthly. 0 when invalid. */
export function monthsInRange(range: DateRange): number {
  const a = parseDateOnly(range.from);
  const b = parseDateOnly(range.to);
  if (!a || !b) return 0;
  return Math.max(0, (b.y - a.y) * 12 + (b.m - a.m) + 1);
}
