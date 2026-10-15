/** Dashboard numbers, computed from GET /rent-roll, /units, /leases and /properties. Pure functions; only hooks.ts calls them. */
import { addMonthsYM, daysUntil, formatCurrency, formatMonth, formatPercent, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import { expiresWithin, isPastEnd } from "@/features/leases/stats";
import { canGenerateRent, collectionBreakdown, collectionNote, statusDate } from "@/features/rent-roll/stats";
import type { Lease } from "@/types/lease";
import type { RentRollResponse, RentRollRow } from "@/types/rentRoll";
import type { Unit, UnitStatus } from "@/types/unit";

/** "Good morning / afternoon / evening, {first name}" from the local hour (before 12, before 18, else). */
export function greeting(name: string, now = new Date()): string {
  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const first = name.trim().split(/\s+/)[0];
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}

/** The header description for the role and scope. */
export function headerDescription(p: { isOwner: boolean; propertyCount: number; unitCount: number; propertyName: string | null; month: string }): string {
  const month = formatMonth(p.month);
  const units = plural(p.unitCount, "unit");
  if (p.propertyName) return `${p.propertyName}, ${units}, ${month}.`;
  if (p.isOwner) return `Portfolio health for ${month} across ${plural(p.propertyCount, "property", "properties")} and ${units}.`;
  return `Your ${plural(p.propertyCount, "assigned property", "assigned properties")}, ${units}, ${month}.`;
}

/** "Oct" from "2026-10". */
export const shortMonth = (month: string) => formatMonth(month).slice(0, 3);

/** `count` months ending with `last` (oldest first), or starting with `first` when `forward`. */
export function monthRange(from: string, count: number, forward = false): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsYM(from, forward ? i : i - (count - 1)));
}

/* ---------- Rent collection ---------- */

export interface RentCollection {
  totalRentDue: string;
  collected: string;
  outstandingBalance: string;
  overdueCount: number;
  overdueTotal: string;
  /** 0-100, or null when nothing is billed. */
  rate: number | null;
  /** Rows that aren't NOT_BILLED. */
  billedCount: number;
  /** PAID rows. */
  paidCount: number;
  /** "Includes $X toward earlier balances and $Y paid in advance", or null (see collectionNote). */
  collectedNote: string | null;
}

export function rentCollection(roll: RentRollResponse): RentCollection {
  const s = roll.summary;
  return {
    totalRentDue: s.totalRentDue,
    collected: s.collected,
    outstandingBalance: s.outstandingBalance,
    overdueCount: s.overdueCount,
    overdueTotal: s.overdueTotal,
    // A percentage, not money: Number is fine here.
    rate: s.collectionRate === null ? null : Number(s.collectionRate),
    billedCount: roll.rows.filter((r) => r.status !== "NOT_BILLED").length,
    paidCount: roll.rows.filter((r) => r.status === "PAID").length,
    collectedNote: collectionNote(collectionBreakdown(roll.rows)),
  };
}

/* ---------- Units ---------- */

export type UnitCounts = Record<UnitStatus, number> & { total: number };

export function unitCounts(units: Unit[]): UnitCounts {
  const counts: UnitCounts = { total: units.length, VACANT: 0, OCCUPIED: 0, RESERVED: 0, UNDER_MAINTENANCE: 0 };
  for (const u of units) counts[u.status]++;
  return counts;
}

/** "{reserved} reserved, {maintenance} under maintenance" (non-zero parts only), or "All units are occupied". */
export function vacantNote(c: UnitCounts): string {
  const parts = [c.RESERVED > 0 ? `${c.RESERVED} reserved` : null, c.UNDER_MAINTENANCE > 0 ? `${c.UNDER_MAINTENANCE} under maintenance` : null].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return c.VACANT === 0 ? "All units are occupied" : "None reserved or under maintenance";
}

/* ---------- Leases ---------- */

/** ACTIVE leases past their end date or ending within 60 days (UTC today, the Leases page rule), soonest first. */
export function atRiskLeases(leases: Lease[]): Lease[] {
  return leases
    .filter((l) => isPastEnd(l) || expiresWithin(l, 60))
    .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
}

/** The Expires badge of an at-risk lease (local day counts, like the Leases page). */
export function expiresBadge(lease: Lease): { tone: "danger" | "warning"; text: string } {
  const days = daysUntil(lease.endDate) ?? 0;
  if (isPastEnd(lease) || days < 0) return { tone: "danger", text: `Ended ${plural(Math.max(1, -days), "day")} ago` };
  const text = days === 0 ? "Today" : plural(days, "day");
  return { tone: days <= 30 ? "danger" : "warning", text };
}

/** ACTIVE leases per end month, for `months` ("YYYY-MM"). */
export function expirationsByMonth(leases: Lease[], months: string[]): { month: string; count: number }[] {
  const counts = new Map(months.map((m) => [m, 0]));
  for (const l of leases) {
    // "YYYY-MM-DD" -> "YYYY-MM" (string slice, no Date parsing).
    const m = l.status === "ACTIVE" && l.endDate ? l.endDate.slice(0, 7) : null;
    if (m && counts.has(m)) counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }));
}

/* ---------- Overdue rent ---------- */

/** OVERDUE rows of the month, oldest unpaid first, with "{n} days overdue". */
export function overdueRows(rows: RentRollRow[]): { row: RentRollRow; note: string | null }[] {
  return rows
    .filter((r) => r.status === "OVERDUE")
    .sort((a, b) => (a.oldestUnpaidDueDate ?? "").localeCompare(b.oldestUnpaidDueDate ?? ""))
    .map((row) => ({ row, note: statusDate(row).text }));
}

/* ---------- Billed vs collected ---------- */

export interface BilledPoint {
  month: string;
  /** Cents; null when nothing is billed. */
  billedCents: number | null;
  collectedCents: number | null;
  /** "Billed $X · Collected $Y · 87.5% collected", or "Not billed". */
  tooltip: string;
}

export function billedPoint(month: string, roll: RentRollResponse): BilledPoint {
  const s = roll.summary;
  const billed = toCents(s.totalRentDue);
  if (billed === 0) return { month, billedCents: null, collectedCents: null, tooltip: `${formatMonth(month)}: Not billed` };
  const rate = s.collectionRate === null ? "" : ` · ${formatPercent(s.collectionRate)} collected`;
  return {
    month,
    billedCents: billed,
    collectedCents: toCents(s.collected),
    tooltip: `${formatMonth(month)}: Billed ${formatCurrency(s.totalRentDue)} · Collected ${formatCurrency(s.collected)}${rate}`,
  };
}

/* ---------- Needs attention ---------- */

export type AttentionAction = { label: string; to: string } | { label: string; generate: true };

export interface AttentionItem {
  key: string;
  title: string;
  text: string;
  action: AttentionAction;
}

/** One item per rule that applies, in a fixed order: not billed, overdue, past end, expiring within 30 days, drafts. */
export function attentionItems(p: { month: string; roll: RentRollResponse; leases: Lease[]; canCharge: boolean }): AttentionItem[] {
  const items: AttentionItem[] = [];
  const month = formatMonth(p.month);
  const rows = p.roll.rows;
  const notBilled = rows.filter((r) => r.status === "NOT_BILLED").length;
  if (p.canCharge && canGenerateRent(p.month) && notBilled > 0) {
    items.push({
      key: "not-billed",
      title: notBilled === rows.length ? `Rent for ${month} isn't billed yet` : `${plural(notBilled, "lease")} ${notBilled === 1 ? "isn't" : "aren't"} billed for ${month} yet`,
      text: "Generate it so balances are up to date.",
      action: { label: "Generate rent", generate: true },
    });
  }
  const overdue = p.roll.summary.overdueCount;
  if (overdue > 0) {
    items.push({ key: "overdue", title: `${plural(overdue, "tenant")} overdue`, text: `${formatCurrency(p.roll.summary.overdueTotal)} past due in total.`, action: { label: "Open Rent Roll", to: "/rent-roll" } });
  }
  const pastEnd = p.leases.filter((l) => isPastEnd(l)).length;
  if (pastEnd > 0) {
    items.push({
      key: "past-end",
      title: `${plural(pastEnd, "lease")} past ${pastEnd === 1 ? "its" : "their"} end date`,
      text: "Still active after the term. End them or change the end date.",
      action: { label: "View leases", to: "/leases" },
    });
  }
  const ending = p.leases.filter((l) => l.status === "ACTIVE" && l.endingSoon).length;
  if (ending > 0) {
    items.push({ key: "ending", title: `${plural(ending, "lease")} ${ending === 1 ? "ends" : "end"} within 30 days`, text: "Plan renewals or move-outs.", action: { label: "View leases", to: "/leases" } });
  }
  const drafts = p.leases.filter((l) => l.status === "DRAFT").length;
  if (drafts > 0) {
    items.push({ key: "drafts", title: `${plural(drafts, "draft lease")} not active yet`, text: "Activate them to start billing.", action: { label: "View leases", to: "/leases" } });
  }
  return items;
}
