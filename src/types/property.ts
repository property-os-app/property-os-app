/** Types for the properties endpoints. Source: docs/API.md sections 2 and 4 ("Property"). */

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
