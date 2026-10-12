/** Types for the units endpoints. Source: docs/API.md sections 2 and 4 ("Unit"). */

export type UnitType = "STUDIO" | "ONE_BED" | "TWO_BED" | "THREE_BED" | "FOUR_BED";

export type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "UNDER_MAINTENANCE";

/** GET /units and GET /units/:id. No property or lease is embedded. */
export interface Unit {
  id: string;
  propertyId: string;
  /** Not unique, sorted as text by the API. */
  unitNumber: string;
  unitType: UnitType;
  /** Square feet (float). */
  floorArea: number;
  /** Integer, can be negative. */
  floor: number | null;
  bathrooms: number | null;
  /** Money string, e.g. "1200" or "1200.5". */
  monthlyRent: string;
  status: UnitStatus;
  description: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}
