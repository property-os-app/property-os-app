/** Types for the properties endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2 and 4 ("Property"). */

export type PropertyType = "RESIDENTIAL" | "COMMERCIAL" | "MIXED_USE";

/** GET /properties and GET /properties/:id. No managers, units or counts are embedded. */
export interface Property {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  /** Money string, e.g. "250000". */
  propertyValue: string;
  /** ISO timestamp (not "YYYY-MM-DD"). */
  acquisitionDate: string;
  description: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
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
