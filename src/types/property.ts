/** Types for the properties endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2 and 4 ("Property"). */

export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE";

/** One manager embedded in a Property: no email (use GET /properties/:id/managers for emails). */
export interface PropertyManagerRef {
  id: string;
  name: string;
}

/** Every Property endpoint (GET list and one, POST, PATCH, DELETE). Units are not embedded; unitCount and managers are. */
export interface Property {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  /** Money string with 2 decimals, e.g. "250000.00". */
  propertyValue: string;
  /** "YYYY-MM-DD" (date only). */
  acquisitionDate: string;
  description: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** All units of the property. */
  unitCount: number;
  /** Oldest assignment first; [] when none. */
  managers: PropertyManagerRef[];
}

/** POST /properties body. Money is a JSON number (max 2 decimals); acquisitionDate is "YYYY-MM-DD". */
export interface PropertyCreateBody {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  propertyValue: number;
  acquisitionDate: string;
  description?: string;
  /** Create only; each must be an existing PROPERTY_MANAGER. */
  managerIds?: string[];
}

/** PATCH /properties/:id body: any subset. Only description may be null (clears it). managerIds is not accepted. */
export type PropertyUpdateBody = Partial<Omit<PropertyCreateBody, "managerIds" | "description">> & {
  description?: string | null;
};
