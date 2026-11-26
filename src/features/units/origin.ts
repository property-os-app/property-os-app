/** Where the unit page was opened from: its first crumb (where Back goes) and its Sidebar item. No React, so it is unit-testable. */
import type { ModuleKey } from "@/components/organisms";
import { unitLabel } from "@/lib/labels";
import type { Crumb } from "@/features/shared/DetailParts";

export type UnitOrigin = "units" | "property" | "rent-roll" | "lease";

/** Router state from every link into /units/:id. Without `from` (pasted link, new tab) the parent is Units (or the Rent Roll year from the URL). */
export interface UnitPageState {
  from?: UnitOrigin;
  /** With from "property": the crumb names the property and links to it. */
  property?: { id: string; name: string };
  /** With from "lease": the crumb "Lease LSE-…" links to it. */
  lease?: { id: string; number: string };
}

/** The yearly Rent Roll's year in the URL (?from=rent-roll&view=year&year=YYYY), so a pasted link still knows it. */
export function rentRollYear(search: URLSearchParams): string | null {
  const year = search.get("year");
  return search.get("from") === "rent-roll" && search.get("view") === "year" && /^\d{4}$/.test(year ?? "") ? year : null;
}

/** The query a link from the yearly Rent Roll adds to /units/:id. */
export function unitPathFromRentRoll(unitId: string, year: string): string {
  return `/units/${encodeURIComponent(unitId)}?from=rent-roll&view=year&year=${year}`;
}

/** The first crumb, the Sidebar item, and whether Back goes back in history (opened from inside the app). */
export function unitParent(state: UnitPageState | null | undefined, search: URLSearchParams): { parent: Crumb; nav: ModuleKey; backInHistory: boolean } {
  const backInHistory = Boolean(state?.from);
  if (state?.from === "property" && state.property) {
    return { parent: { label: state.property.name, to: `/properties/${encodeURIComponent(state.property.id)}?tab=units` }, nav: "properties", backInHistory };
  }
  if (state?.from === "lease" && state.lease) {
    return { parent: { label: `Lease ${state.lease.number}`, to: `/leases/${encodeURIComponent(state.lease.id)}` }, nav: "leases", backInHistory };
  }
  const year = rentRollYear(search);
  if (year) return { parent: { label: `Rent Roll · ${year}`, to: `/rent-roll?view=year&year=${year}` }, nav: "rentroll", backInHistory };
  return { parent: { label: "Units", to: "/units" }, nav: "units", backInHistory };
}

/** "Unit 4B, Maple Court" (just "Unit 4B" while the property name is unknown). */
export function unitName(unitNumber: string, propertyName: string | undefined): string {
  return propertyName ? `${unitLabel(unitNumber)}, ${propertyName}` : unitLabel(unitNumber);
}
