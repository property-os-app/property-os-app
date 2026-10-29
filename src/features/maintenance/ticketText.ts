/** Display text for tickets: number, location, age, SLA, closed line, week start (unit-tested). */
import { addDaysISO, formatCurrency, parseDateOnly } from "@/lib/format";
import type { MaintenanceStatus, MaintenanceTicket } from "@/types/maintenance";

const ACTIVE: MaintenanceStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS"];

/** OPEN, ASSIGNED or IN_PROGRESS. */
export function isActive(status: MaintenanceStatus): boolean {
  return ACTIVE.includes(status);
}

/** "#1042". */
export function ticketNo(t: Pick<MaintenanceTicket, "ticketNumber">): string {
  return `#${t.ticketNumber}`;
}

/** "Unit 7D, Maple Court", "Common area, Oakridge Commons", or just the property name. The unit wins over the note. */
export function locationLabel(t: Pick<MaintenanceTicket, "property" | "unit" | "locationNote">): string {
  if (t.unit) return `Unit ${t.unit.unitNumber}, ${t.property.name}`;
  if (t.locationNote) return `${t.locationNote}, ${t.property.name}`;
  return t.property.name;
}

/** A positive span in short form: "45m", "3h", "2d" (hours up to 48, then days). Rounded down, at least "1m". */
export function spanText(ms: number): string {
  const mins = Math.max(1, Math.floor(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Time since a timestamp: "Just now", "45m ago", "2h ago", "3d ago". */
export function ageText(createdAt: string, now = new Date()): string {
  const ms = now.getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms)) return "";
  if (ms < 60_000) return "Just now";
  return `${spanText(ms)} ago`;
}

export interface SlaText {
  label: string;
  /** danger once past SLA (the server's flag), warning while the clock runs. */
  tone: "danger" | "warning";
}

/**
 * "Past SLA by 2h" (server says pastSla) or "Due in 3h" / "Due now" while active with a due time. null when the ticket has
 * no SLA or isn't active. Past or not always comes from `sla.pastSla`; only the hours are worked out here.
 */
export function slaText(t: Pick<MaintenanceTicket, "status" | "sla">, now = new Date()): SlaText | null {
  if (!isActive(t.status) || !t.sla.dueAt) return null;
  const left = new Date(t.sla.dueAt).getTime() - now.getTime();
  if (t.sla.pastSla) return { label: `Past SLA by ${spanText(Math.max(0, -left))}`, tone: "danger" };
  return { label: left > 0 ? `Due in ${spanText(left)}` : "Due now", tone: "warning" };
}

/** "SLA 4h" for EMERGENCY / URGENT tickets, null otherwise. */
export function slaHoursText(t: Pick<MaintenanceTicket, "sla">): string | null {
  return t.sla.hours ? `SLA ${t.sla.hours}h` : null;
}

/** "Oct 6": the local day of a timestamp, no year. */
export function shortTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Resolved card line: "Closed Oct 6 · $18.00", or "Closed Oct 6" without a cost. */
export function closedText(t: Pick<MaintenanceTicket, "resolvedAt" | "actualCost">): string | null {
  if (!t.resolvedAt) return null;
  const day = `Closed ${shortTimestamp(t.resolvedAt)}`;
  return t.actualCost ? `${day} · ${formatCurrency(t.actualCost)}` : day;
}

/** The Sunday on or before a local "YYYY-MM-DD" day (US weeks start on Sunday). null when the date is invalid. */
export function startOfWeek(today: string): string | null {
  const p = parseDateOnly(today);
  if (!p) return null;
  // Date.UTC only as a calendar (day of week), no time zone involved.
  const weekday = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return addDaysISO(today, -weekday);
}

/** "Oct 29, 2026, 10:00 AM": a timestamp in local time, for the drawer timeline. */
export function timestampText(timestamp: string): string {
  const d = new Date(timestamp);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * The Emergency KPI note: "None open"; one: "Open 2h, unassigned" (", unassigned" only when it has no vendor); several:
 * "Oldest open 5h · 1 unassigned".
 */
export function emergencyNote(e: { openCount: number; unassignedCount: number; oldestCreatedAt: string | null }, now = new Date()): string {
  if (e.openCount === 0) return "None open";
  const age = e.oldestCreatedAt ? spanText(now.getTime() - new Date(e.oldestCreatedAt).getTime()) : null;
  if (e.openCount === 1) return `${age ? `Open ${age}` : "Open"}${e.unassignedCount > 0 ? ", unassigned" : ""}`;
  const oldest = age ? `Oldest open ${age}` : `${e.openCount} open`;
  return e.unassignedCount > 0 ? `${oldest} · ${e.unassignedCount} unassigned` : oldest;
}
