/** Display texts for a vendor's rate and insurance (unit-tested). */
import { formatCurrency, formatShortDate, parseDateOnly, todayISO } from "@/lib/format";
import { rateUnitLabels } from "@/lib/labels";
import type { Vendor } from "@/types/vendor";

/** "$110.00 / hour", or null without a rate (the server keeps amount and unit together). */
export function rateText(v: Pick<Vendor, "rateAmount" | "rateUnit">): string | null {
  if (v.rateAmount === null || v.rateUnit === null) return null;
  return `${formatCurrency(v.rateAmount)} / ${rateUnitLabels[v.rateUnit]}`;
}

/** "Plumbing · Downtown" (the area only when set). */
export function tradeLine(tradeLabel: string, v: Pick<Vendor, "serviceArea">): string {
  return v.serviceArea ? `${tradeLabel} · ${v.serviceArea}` : tradeLabel;
}

/** "Sep 15", plus ", 2025" when the year isn't this year. */
function dayText(date: string, today: string): string {
  const p = parseDateOnly(date);
  if (!p) return date;
  return p.y === Number(today.slice(0, 4)) ? formatShortDate(date) : `${formatShortDate(date)}, ${p.y}`;
}

/**
 * The insurance badge text from the backend's insuranceStatus (never computed here) and the expiry date:
 * "Expired Sep 15" / "Expires Oct 29" / "Valid to Mar 2027" / "No insurance on file". `today` is local "YYYY-MM-DD".
 */
export function insuranceText(v: Pick<Vendor, "insuranceStatus" | "insuranceExpiresOn">, today = todayISO()): string {
  const date = v.insuranceExpiresOn;
  if (v.insuranceStatus === "NONE" || !date) return "No insurance on file";
  if (v.insuranceStatus === "EXPIRED") return `Expired ${dayText(date, today)}`;
  if (v.insuranceStatus === "EXPIRING") return `Expires ${dayText(date, today)}`;
  const p = parseDateOnly(date);
  return p ? `Valid to ${formatShortDate(date).split(" ")[0]} ${p.y}` : "Valid";
}
