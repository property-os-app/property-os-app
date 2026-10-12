/** Types for the managers endpoints. Source: docs/API.md section 4 ("ManagerSummary", "ManagerListItem"). */

/** GET /properties/:propertyId/managers items, and the body of assign / unassign. */
export interface ManagerSummary {
  id: string;
  email: string;
  name: string;
}

/** GET /managers (OWNER only): every PROPERTY_MANAGER user, email A→Z. */
export interface ManagerListItem extends ManagerSummary {
  assignedPropertyCount: number;
}
