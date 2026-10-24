/** Lease money and date helpers shared by the leases page, the unit drawer and the tenants page. Money math in integer cents. */
import { addDaysISO, addMonthsISO, addMonthsYM, currentMonth, dayInMonth, daysUntil, formatDate, parseDateOnly, todayUTC, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import type { Lease, LeaseStatus, LeaseTenant } from "@/types/lease";

/** "Nov 1, 2026 to Oct 31, 2027"; null when both dates are missing (a missing one shows "-"). */
export function leasePeriod(lease: Lease): string | null {
  return lease.startDate || lease.endDate ? `${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}` : null;
}

/**
 * Where the lease stands on payments, by the backend's rule (UTC today, ../property-os-api/docs/frontend-handoff/API.md rent roll):
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

/* ---------- Leases page ---------- */

/** Primary tenant first (the API sends it first; isPrimary is checked anyway). */
/**
 * The first rent due date on or after the start: the due day in the start month (clamped to its last day),
 * or in the next month when that is before the start. ("2026-10-14", 1) -> "2026-11-01". null when either is missing.
 */
export function firstRentDate(start: string | null | undefined, dueDay: number | null | undefined): string | null {
  if (!start || !parseDateOnly(start) || !dueDay) return null;
  const month = start.slice(0, 7);
  const here = dayInMonth(month, dueDay);
  return here !== null && here >= start ? here : dayInMonth(addMonthsYM(month, 1), dueDay);
}

export function primaryTenant(lease: Lease): LeaseTenant | undefined {
  return lease.tenants.find((t) => t.isPrimary);
}

export function coTenants(lease: Lease): LeaseTenant[] {
  return lease.tenants.filter((t) => !t.isPrimary);
}

/** ENDED or TERMINATED: final, only notes and tags can change. */
export function isClosed(lease: Pick<Lease, "status">): boolean {
  return lease.status === "ENDED" || lease.status === "TERMINATED";
}

/** ACTIVE and the end date is before UTC today (the backend's today): still active after the term. */
export function isPastEnd(lease: Lease, today = todayUTC()): boolean {
  return lease.status === "ACTIVE" && lease.endDate !== null && lease.endDate < today;
}

/** ACTIVE with an end date from UTC today to today + `days` (inclusive). */
export function expiresWithin(lease: Lease, days: number, today = todayUTC()): boolean {
  if (lease.status !== "ACTIVE" || !lease.endDate) return false;
  const last = addDaysISO(today, days);
  return lease.endDate >= today && last !== null && lease.endDate <= last;
}

/** ACTIVE leases whose start date is in the current local month. */
export function startedThisMonth(leases: Lease[], month = currentMonth()): number {
  return leases.filter((l) => l.status === "ACTIVE" && l.startDate?.slice(0, 7) === month).length;
}

/** "Unit 4B, Maple Court". */
export function leaseUnitLine(lease: Lease): string {
  return `Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}`;
}

/** "Past end date" KPI note: one -> "Unit 4B, Maple Court"; more -> "3 leases"; none -> "None". */
export function pastEndNote(leases: Lease[]): string {
  if (leases.length === 0) return "None";
  if (leases.length === 1) return leaseUnitLine(leases[0]);
  return plural(leases.length, "lease");
}

const STATUS_RANK: Record<LeaseStatus, number> = { ACTIVE: 0, DRAFT: 1, ENDED: 2, TERMINATED: 2 };
const NO_END = "9999-12-31";

/**
 * Default list order ("sorted by soonest expiry"): ACTIVE by end date ascending, then DRAFT newest first,
 * then ENDED / TERMINATED with the latest end date first.
 */
export function compareLeasesDefault(a: Lease, b: Lease): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rank !== 0) return rank;
  if (a.status === "ACTIVE") return (a.endDate ?? NO_END).localeCompare(b.endDate ?? NO_END);
  if (a.status === "DRAFT") return b.createdAt.localeCompare(a.createdAt);
  return (b.endDate ?? "").localeCompare(a.endDate ?? "");
}

/* ---------- Activation ---------- */

/** Friendly names of the fields activation needs, keyed by the backend field name (as in "Cannot activate lease: missing ..."). */
export const activationFieldLabels: Record<string, string> = {
  primaryTenantId: "Primary tenant",
  startDate: "Start date",
  endDate: "End date",
  rent: "Monthly rent",
  deposit: "Security deposit",
  rentDueDay: "Rent due day",
  paymentFrequency: "Payment frequency",
};

/** The values activation checks, from a lease or from the wizard form. */
export interface ActivationParts {
  primaryTenantId: string | null | undefined;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  rent: string | number | null | undefined;
  deposit: string | number | null | undefined;
  rentDueDay: number | string | null | undefined;
}

/** What is still missing to activate, as friendly names (empty when ready). Also "End date after the start date". */
export function missingToActivate(p: ActivationParts): string[] {
  const missing: string[] = [];
  const empty = (v: unknown) => v === null || v === undefined || v === "";
  for (const key of ["primaryTenantId", "startDate", "endDate", "rent", "deposit", "rentDueDay"] as const) {
    if (empty(p[key])) missing.push(activationFieldLabels[key]);
  }
  if (p.startDate && p.endDate && p.endDate <= p.startDate) missing.push("End date after the start date");
  return missing;
}

/** missingToActivate for a saved lease. */
export function leaseMissing(lease: Lease): string[] {
  return missingToActivate({ ...lease, primaryTenantId: primaryTenant(lease)?.id });
}

/** Friendly names of every lease field the backend can name in an error, keyed by the backend field name. */
export const leaseFieldLabels: Record<string, string> = {
  ...activationFieldLabels,
  unitId: "Unit",
  coTenantIds: "Co-tenants",
  lateFeeAmount: "Late fee",
  lateFeeGraceDays: "Grace period",
  autoRenew: "Auto-renew",
  signatureStatus: "E-signature status",
  tags: "Tags",
  notes: "Notes",
  status: "Status",
  templateId: "Template",
};

/** "Standard Lease – 12-month · v2": the lease's template and its pinned version; null without a template. */
export function templateLine(lease: Pick<Lease, "template">): string | null {
  return lease.template ? `${lease.template.name} · v${lease.template.version}` : null;
}

/** "rent" -> "Monthly rent"; an unknown name stays as it is. */
export const leaseFieldLabel = (field: string) => leaseFieldLabels[field] ?? field;

/**
 * A backend lease message that lists fields (backend names, in the backend's order):
 * - missing: 400 "Cannot activate lease: missing rent, deposit" (activate, or create as ACTIVE).
 * - activeNeeds: 400 "Lease LSE-2026-001 is ACTIVE, so it needs: rent. These can't be cleared on an ACTIVE lease." (PATCH).
 * - closed: 409 "Lease LSE-2026-001 is ENDED, so only notes and tags can be changed. Not allowed: rent, startDate." (PATCH).
 */
export type LeaseFieldsMessage =
  | { kind: "missing"; fields: string[] }
  | { kind: "activeNeeds"; leaseNumber: string; fields: string[] }
  | { kind: "closed"; leaseNumber: string; status: "ENDED" | "TERMINATED"; fields: string[] };

const fieldList = (text: string) =>
  text
    .split(/,\s*/)
    .map((f) => f.trim())
    .filter(Boolean);

/** Parses one of the three messages above; null when the message is something else. */
export function parseLeaseFieldsMessage(message: string): LeaseFieldsMessage | null {
  const missing = /^Cannot activate lease: missing (.+?)\.?$/.exec(message);
  if (missing) return { kind: "missing", fields: fieldList(missing[1]) };
  const needs = /^Lease (\S+) is ACTIVE, so it needs: (.+?)\. These can't be cleared/.exec(message);
  if (needs) return { kind: "activeNeeds", leaseNumber: needs[1], fields: fieldList(needs[2]) };
  const closed = /^Lease (\S+) is (ENDED|TERMINATED), so only notes and tags can be changed\. Not allowed: (.+?)\.?$/.exec(message);
  if (closed) return { kind: "closed", leaseNumber: closed[1], status: closed[2] as "ENDED" | "TERMINATED", fields: fieldList(closed[3]) };
  return null;
}

/** Friendly names from "Cannot activate lease: missing primaryTenantId, rent" (null when the message is something else). */
export function parseMissingMessage(message: string): string[] | null {
  const parsed = parseLeaseFieldsMessage(message);
  return parsed?.kind === "missing" ? parsed.fields.map(leaseFieldLabel) : null;
}

/**
 * A backend lease message with friendly field names; any other message unchanged.
 * "Cannot activate lease: missing rent" -> "Missing to activate: Monthly rent."
 * "Lease X is ACTIVE, so it needs: rent. ..." -> "Lease X is active, so these can't be cleared: Monthly rent."
 * "Lease X is ENDED, so only ... Not allowed: rent." -> "Lease X is ended, so only notes and tags can change. Not allowed: Monthly rent."
 */
export function friendlyLeaseMessage(message: string): string {
  const parsed = parseLeaseFieldsMessage(message);
  if (!parsed) return message;
  const names = parsed.fields.map(leaseFieldLabel).join(", ");
  switch (parsed.kind) {
    case "missing":
      return `Missing to activate: ${names}.`;
    case "activeNeeds":
      return `Lease ${parsed.leaseNumber} is active, so these can't be cleared: ${names}.`;
    case "closed":
      return `Lease ${parsed.leaseNumber} is ${parsed.status.toLowerCase()}, so only notes and tags can change. Not allowed: ${names}.`;
  }
}

/**
 * Whole months of a term, end date inclusive (2026-01-01 to 2026-12-31 = 12), like the backend's termMonths.
 * null when a date is missing or the end is not after the start.
 */
export function termMonthsOf(start: string, end: string): number | null {
  if (!start || !end || end <= start) return null;
  const endExclusive = addDaysISO(end, 1);
  if (!endExclusive) return null;
  let n = (Number(endExclusive.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + (Number(endExclusive.slice(5, 7)) - Number(start.slice(5, 7)));
  while (n > 0 && (addMonthsISO(start, n) ?? "") > endExclusive) n -= 1;
  return n;
}

/** End date of a term of `months` from `start`: addMonthsISO(start, months) minus 1 day (the end date is included). */
export function termEndDate(start: string, months: number): string | null {
  const next = addMonthsISO(start, months);
  return next ? addDaysISO(next, -1) : null;
}

/* ---------- Tags ---------- */

/** Backend tag rules (../property-os-api/docs/frontend-handoff/rules.md, Leases): max 10 tags, each max 30 characters after trimming. */
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

/** Trimmed, inner spaces collapsed: "  Pet   Friendly " -> "Pet Friendly". */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}
