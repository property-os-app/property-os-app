/** Document category lists from GET /documents/categories: the list per owner type and the label of a stored value. No API import, so it is unit-testable. */
import type { DocumentCategories, DocumentCategoryOption, DocumentOwner } from "@/types/document";

/** Our owner (the path prefix, plural) -> the key of its list in the categories response (singular). */
const LIST_KEY: Record<DocumentOwner, keyof DocumentCategories> = { leases: "lease", tenants: "tenant", units: "unit", properties: "property" };

/** That owner type's categories in the API's order; [] while the lists are loading (or failed). */
export function categoryOptions(categories: DocumentCategories | undefined, owner: DocumentOwner): DocumentCategoryOption[] {
  return categories?.[LIST_KEY[owner]] ?? [];
}

/** A readable label made from a value, for when the list isn't there: "OLD_LEASE" -> "Old lease", "ID" -> "Id". */
export function fallbackCategoryLabel(value: string): string {
  const words = value.trim().replace(/_+/g, " ").toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Uncategorised";
}

/**
 * The label of a stored category, looked up in that owner type's own list (the same value can have another label on
 * another owner type: INSPECTION is "Other inspection" on leases, "Inspection" on units). While loading or for an
 * unknown value, a readable fallback from the value; never blank.
 */
export function categoryLabel(categories: DocumentCategories | undefined, owner: DocumentOwner, value: string): string {
  return categoryOptions(categories, owner).find((c) => c.value === value)?.label ?? fallbackCategoryLabel(value);
}
