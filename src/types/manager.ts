/** Types for the managers endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("ManagerSummary", "ManagerListItem", "ManagerAccess"). */

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

/** GET / PUT /managers/:userId/access (OWNER only): what the manager may do and which properties they see. Both lists A→Z. */
export interface ManagerAccess {
  userId: string;
  permissions: string[];
  propertyIds: string[];
}

/** PUT /managers/:userId/access body. Replaces both lists: always send the full state ([] turns everything off). */
export interface ManagerAccessBody {
  permissions: string[];
  propertyIds: string[];
}
