/** Numbers and labels the frontend computes for tenants from GET /tenants + GET /leases. Money math in integer cents. */
import { daysUntil, parseDateOnly, todayISO, toCents } from "@/lib/format";
import { compareNatural } from "@/lib/sort";
import { leaseEndDate } from "@/features/leases/leaseEnd";
import { dueState } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";
import type { Tenant, TenantListItem } from "@/types/tenant";
import { contactMethodLabels, unitLabel } from "@/lib/labels";

/** One tenant with every visible lease they are on and their current lease. */
export interface TenantRow {
  tenant: TenantListItem;
  /** Leases whose tenants[] contains this tenant (only leases this user can see). */
  leases: Lease[];
  current?: Lease;
}

/** Lease status filter values. "active" includes expiring leases; "ended" is ENDED or TERMINATED. */
export type LeaseFilter = "all" | "active" | "expiring" | "draft" | "ended" | "none";

const byEndDate = (a: Lease, b: Lease) => (leaseEndDate(a) ?? "9999-12-31").localeCompare(leaseEndDate(b) ?? "9999-12-31");

/**
 * The tenant's current lease: the ACTIVE one (several: the soonest endDate), else a DRAFT (the newest),
 * else the ENDED or TERMINATED one that ended last (`leaseEndDate`); a cancelled one only when there is nothing else.
 * `leases` must be newest first (as GET /leases returns them).
 */
export function currentLease(leases: Lease[]): Lease | undefined {
  const active = leases.filter((l) => l.status === "ACTIVE").sort(byEndDate);
  if (active.length > 0) return active[0];
  const draft = leases.find((l) => l.status === "DRAFT");
  if (draft) return draft;
  const closed = leases.filter((l) => l.status === "ENDED" || l.status === "TERMINATED").sort(byEndDate);
  return closed.filter((l) => !l.cancelledOn).at(-1) ?? closed.at(-1);
}

/** Rows in the default order: balance highest first (no lease last), then name. */
export function buildTenantRows(tenants: TenantListItem[], leases: Lease[]): TenantRow[] {
  const byTenant = new Map<string, Lease[]>();
  for (const lease of leases) {
    for (const t of lease.tenants) byTenant.set(t.id, [...(byTenant.get(t.id) ?? []), lease]);
  }
  return tenants
    .map((tenant) => {
      const list = byTenant.get(tenant.id) ?? [];
      return { tenant, leases: list, current: currentLease(list) };
    })
    .sort((a, b) => balanceRank(b) - balanceRank(a) || compareNatural(a.tenant.fullName, b.tenant.fullName));
}

function balanceRank(row: TenantRow): number {
  return row.current ? toCents(row.current.balance) : Number.NEGATIVE_INFINITY;
}

/** Which Lease status filter the row's current lease falls under ("active" rows that end soon are also "expiring"). */
export function matchesLeaseFilter(row: TenantRow, filter: LeaseFilter): boolean {
  const lease = row.current;
  switch (filter) {
    case "all":
      return true;
    case "none":
      return !lease;
    case "active":
      return lease?.status === "ACTIVE";
    case "expiring":
      return lease?.status === "ACTIVE" && lease.endingSoon;
    case "draft":
      return lease?.status === "DRAFT";
    case "ended":
      return lease?.status === "ENDED" || lease?.status === "TERMINATED";
  }
}

/** True when the current lease has a balance above $0. */
export function hasBalance(row: TenantRow): boolean {
  return Boolean(row.current && toCents(row.current.balance) > 0);
}

/** Rent status of an ACTIVE lease (backend rule, UTC today): overdue, due today, or up to date. null without an ACTIVE lease. */
export type RentStatus = "overdue" | "today" | "ok";

export function rentStatus(lease: Lease | undefined): RentStatus | null {
  if (lease?.status !== "ACTIVE") return null;
  const due = dueState(lease);
  return due.kind === "overdue" ? "overdue" : due.kind === "today" ? "today" : "ok";
}

/** "Unit 4B, Maple Court" for the current lease, or null. */
export function unitLine(lease: Lease | undefined): string | null {
  return lease ? `${unitLabel(lease.unit.unitNumber)}, ${lease.unit.property.name}` : null;
}

/** Texts the search box looks in (null = the tenant has none): name, email, phone, unit number and property of the current lease. */
export function tenantSearchText(row: TenantRow): (string | null)[] {
  const { tenant, current } = row;
  return [
    tenant.fullName,
    tenant.email,
    tenant.phone,
    ...(current ? [current.unit.unitNumber, `${unitLabel(current.unit.unitNumber)}`, current.unit.property.name] : []),
  ];
}

/** "Email", or "Email (no email on file)" when the preferred way isn't there (the API allows it). */
export function preferredContactText(t: Pick<Tenant, "email" | "phone" | "preferredContactMethod">): string {
  const label = contactMethodLabels[t.preferredContactMethod];
  if (t.preferredContactMethod === "EMAIL") return t.email ? label : `${label} (no email on file)`;
  return t.phone ? label : `${label} (no phone on file)`;
}

/* ---------- KPIs ---------- */

/** Calendar quarter (1-4) and year of a "YYYY-MM-DD" date. */
function quarterOf(date: string): string {
  return `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
}

/** Tenants whose moveInDate ("YYYY-MM-DD") is in the current calendar quarter (local date). */
export function movedInThisQuarter(rows: TenantRow[], today = todayISO()): number {
  const q = quarterOf(today);
  return rows.filter((r) => r.tenant.moveInDate && parseDateOnly(r.tenant.moveInDate) && quarterOf(r.tenant.moveInDate) === q).length;
}

/** Tenants on an ACTIVE lease (their current lease is ACTIVE). */
export function activeLeaseCount(rows: TenantRow[]): number {
  return rows.filter((r) => r.current?.status === "ACTIVE").length;
}

/** Tenants with a balance, and the total owed: each lease's balance counted once, even with several tenants. */
export function outstanding(rows: TenantRow[]): { count: number; totalCents: number } {
  const owing = rows.filter(hasBalance);
  const leases = new Map(owing.map((r) => [r.current!.id, r.current!]));
  let totalCents = 0;
  for (const lease of leases.values()) totalCents += toCents(lease.balance);
  return { count: owing.length, totalCents };
}

/** Tenants whose current lease is ENDED or TERMINATED (not an old or cancelled lease) and ended in the last 30 days (`leaseEndDate`, local calendar days). */
export function recentMoveOuts(rows: TenantRow[]): number {
  return rows.filter((r) => {
    const lease = r.current;
    // Old (history-only) leases are records of the past, and on a cancelled one nobody moved in: not move-outs.
    if ((lease?.status !== "ENDED" && lease?.status !== "TERMINATED") || lease.isHistorical || lease.cancelledOn) return false;
    const days = daysUntil(leaseEndDate(lease));
    return days !== null && days <= 0 && days >= -30;
  }).length;
}
