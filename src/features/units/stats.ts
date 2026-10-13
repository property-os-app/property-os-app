/** Numbers and notes the frontend computes for units and their active lease. All money math in integer cents. */
import { centsToAmount, formatCurrency, toCents } from "@/lib/format";
import { plural, unitLayout } from "@/lib/labels";
import { compareNatural } from "@/lib/sort";
import type { Lease } from "@/types/lease";
import type { Unit, UnitStatus } from "@/types/unit";

/** One row of the Units list: the unit, its ACTIVE lease (if any) and its property name. */
export interface UnitListRow {
  unit: Unit;
  active?: Lease;
  propertyName: string;
}

/** Default list order: vacant and under maintenance first, then reserved, then occupied. */
const STATUS_RANK: Record<UnitStatus, number> = { VACANT: 0, UNDER_MAINTENANCE: 0, RESERVED: 1, OCCUPIED: 2 };

/** Rows in the default order: status rank, then property name, then unit number ("2" before "10"). */
export function buildUnitListRows(units: Unit[], activeLeases: Lease[], propertyNames: Map<string, string>): UnitListRow[] {
  const activeByUnit = new Map<string, Lease>();
  for (const l of activeLeases) if (l.status === "ACTIVE" && !activeByUnit.has(l.unitId)) activeByUnit.set(l.unitId, l);
  return units
    .map((unit) => ({ unit, active: activeByUnit.get(unit.id), propertyName: propertyNames.get(unit.propertyId) ?? "" }))
    .sort(
      (a, b) =>
        STATUS_RANK[a.unit.status] - STATUS_RANK[b.unit.status] ||
        compareNatural(a.propertyName, b.propertyName) ||
        compareNatural(a.unit.unitNumber, b.unit.unitNumber),
    );
}

/** "Under maintenance" KPI note: one -> "Unit 4B, Maple Court"; more -> "3 units"; none -> "None". */
export function maintenanceNote(rows: UnitListRow[]): string {
  const list = rows.filter((r) => r.unit.status === "UNDER_MAINTENANCE");
  if (list.length === 0) return "None";
  if (list.length === 1) return `Unit ${list[0].unit.unitNumber}${list[0].propertyName ? `, ${list[0].propertyName}` : ""}`;
  return plural(list.length, "unit");
}

/** Text for searching a row: unit number, property name and every tenant on the active lease. */
export function unitSearchText(row: UnitListRow): string[] {
  return [row.unit.unitNumber, `Unit ${row.unit.unitNumber}`, row.propertyName, ...(row.active?.tenants.map((t) => t.fullName) ?? [])];
}

/** Drawer description: "1 bd / 1 ba · 750 sq ft · Floor 3 · Listed rent $1,450.00" (null parts skipped). */
export function unitSummary(unit: Unit): string {
  return [
    unitLayout(unit.unitType, unit.bathrooms),
    `${unit.floorArea.toLocaleString("en-US")} sq ft`,
    unit.floor !== null ? `Floor ${unit.floor}` : null,
    `Listed rent ${formatCurrency(unit.monthlyRent)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ---------- Active lease (due state, period and end notes live in features/leases/stats.ts) ---------- */

/** "Current rent" card note: "$35.00 under listed rent", "$20.00 over listed rent" or "Same as listed rent". */
export function rentDiffNote(leaseRent: string | null, listedRent: string): string {
  const diff = toCents(leaseRent) - toCents(listedRent);
  if (diff === 0) return "Same as listed rent";
  return `${formatCurrency(centsToAmount(Math.abs(diff)))} ${diff < 0 ? "under" : "over"} listed rent`;
}
