/** Numbers the frontend computes for properties (the API stores no counts). All money math in integer cents. */
import type { Tone } from "@/components/atoms";
import { toCents } from "@/lib/format";
import { propertyTypeLabels, unitStatusLabels } from "@/lib/labels";
import type { Lease } from "@/types/lease";
import type { Property } from "@/types/property";
import type { Unit, UnitStatus } from "@/types/unit";

export type UnitCounts = { total: number } & Record<UnitStatus, number>;

export const emptyCounts: UnitCounts = { total: 0, VACANT: 0, OCCUPIED: 0, RESERVED: 0, UNDER_MAINTENANCE: 0 };

const STATUS_ORDER: UnitStatus[] = ["OCCUPIED", "VACANT", "RESERVED", "UNDER_MAINTENANCE"];

/** Unit counts per status for a list of units. */
export function countUnits(units: Unit[]): UnitCounts {
  const counts = { ...emptyCounts };
  for (const u of units) {
    counts.total += 1;
    counts[u.status] += 1;
  }
  return counts;
}

/** Units grouped by propertyId, then counted (one GET /units for every property). */
export function unitCountsByProperty(units: Unit[]): Map<string, UnitCounts> {
  const groups = new Map<string, Unit[]>();
  for (const u of units) groups.set(u.propertyId, [...(groups.get(u.propertyId) ?? []), u]);
  return new Map([...groups].map(([id, list]) => [id, countUnits(list)]));
}

/** Occupancy % = OCCUPIED / all units, rounded to 1 decimal. null when there are no units (show a dash). */
export function occupancy(counts: UnitCounts): number | null {
  return counts.total === 0 ? null : Math.round((counts.OCCUPIED * 1000) / counts.total) / 10;
}

/** "75 occupied, 4 vacant, 1 under maintenance": only the statuses that exist. */
export function unitStatusNote(counts: UnitCounts): string {
  const parts = STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => `${counts[s]} ${unitStatusLabels[s].toLowerCase()}`);
  return parts.length > 0 ? parts.join(", ") : "No units yet";
}

/** "3 residential, 1 mixed use". */
export function typeBreakdown(properties: Property[]): string {
  const order = Object.keys(propertyTypeLabels) as Property["propertyType"][];
  const parts = order
    .map((type) => [type, properties.filter((p) => p.propertyType === type).length] as const)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${n} ${propertyTypeLabels[type].toLowerCase()}`);
  return parts.length > 0 ? parts.join(", ") : "No properties yet";
}

/** Monthly rent per property in cents: the sum of rent of ACTIVE leases (lease.unit.property.id). */
export function activeRentCentsByProperty(leases: Lease[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of leases) {
    if (l.status !== "ACTIVE") continue;
    const id = l.unit.property.id;
    out.set(id, (out.get(id) ?? 0) + toCents(l.rent));
  }
  return out;
}

/** Sum of money strings, in cents. */
export function sumCents(values: (string | null | undefined)[]): number {
  return values.reduce((sum, v) => sum + toCents(v), 0);
}

/** "{street}, {city}, {state} {zip}". */
export function formatAddress(p: Pick<Property, "street" | "city" | "state" | "zip">): string {
  return `${p.street}, ${p.city}, ${p.state} ${p.zip}`;
}

/** Card status badge: vacant first, then under maintenance, then no units, else fully occupied. */
export function propertyStatus(counts: UnitCounts): { tone: Tone; label: string } {
  if (counts.VACANT > 0) return { tone: "warning", label: `${counts.VACANT} vacant` };
  if (counts.UNDER_MAINTENANCE > 0) return { tone: "warning", label: `${counts.UNDER_MAINTENANCE} under maintenance` };
  if (counts.total === 0) return { tone: "neutral", label: "No units" };
  return { tone: "success", label: "Fully occupied" };
}

/* ---------- Units of one property, with their leases ---------- */

export interface UnitRow {
  unit: Unit;
  /** The ACTIVE lease on this unit, if any. */
  active?: Lease;
  /** The newest DRAFT lease on this unit, if any. */
  draft?: Lease;
}

const unitCollator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

/** Units sorted by number ("2" before "10"), each with its active and newest draft lease. */
export function buildUnitRows(units: Unit[], leases: Lease[]): UnitRow[] {
  return [...units]
    .sort((a, b) => unitCollator.compare(a.unitNumber, b.unitNumber))
    .map((unit) => ({
      unit,
      active: leases.find((l) => l.unitId === unit.id && l.status === "ACTIVE"),
      // GET /leases is newest first, so the first draft is the newest.
      draft: leases.find((l) => l.unitId === unit.id && l.status === "DRAFT"),
    }));
}

/** Needs attention: every unit that is not OCCUPIED, plus occupied units whose active lease ends soon. */
export function needsAttention(row: UnitRow): boolean {
  return row.unit.status !== "OCCUPIED" || Boolean(row.active?.endingSoon);
}

/** Primary tenant's name on a lease, or undefined. */
export function primaryTenantName(lease: Lease | undefined): string | undefined {
  return lease?.tenants.find((t) => t.isPrimary)?.fullName ?? lease?.tenants[0]?.fullName;
}

