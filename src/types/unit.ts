/** Types for the units endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2 and 4 ("Unit"). */

export type UnitType = "STUDIO" | "ONE_BED" | "TWO_BED" | "THREE_BED" | "FOUR_BED";

export type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "UNDER_MAINTENANCE";

/** GET /units and GET /units/:id. No property or lease is embedded. */
export interface Unit {
  id: string;
  propertyId: string;
  /** Not unique, sorted numeric-aware by the API ("2" before "10"). */
  unitNumber: string;
  unitType: UnitType;
  /** Square feet (float); null = not set. */
  floorArea: number | null;
  /** Integer, can be negative. */
  floor: number | null;
  bathrooms: number | null;
  /** Listed rent, money string with 2 decimals ("1200.00"); null = not set. "0.00" is a real rent. */
  monthlyRent: string | null;
  status: UnitStatus;
  description: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/** POST /units body (../property-os-api/docs/frontend-handoff/API.md section 5). Money is a JSON number (max 2 decimals). OCCUPIED is never sent. */
export interface UnitCreateBody {
  propertyId: string;
  unitNumber: string;
  unitType: UnitType;
  floorArea?: number;
  /** 0 to 99,999,999.99. */
  monthlyRent?: number;
  floor?: number;
  bathrooms?: number;
  status?: Exclude<UnitStatus, "OCCUPIED">;
  description?: string;
}

/** PATCH /units/:id body: any subset, never propertyId. floorArea, monthlyRent, floor, bathrooms and description may be null (clears them). */
export type UnitUpdateBody = Partial<Omit<UnitCreateBody, "propertyId" | "floorArea" | "monthlyRent" | "floor" | "bathrooms" | "description">> & {
  floorArea?: number | null;
  monthlyRent?: number | null;
  floor?: number | null;
  bathrooms?: number | null;
  description?: string | null;
};
