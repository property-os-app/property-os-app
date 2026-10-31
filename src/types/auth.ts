/** Types for the auth endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 1, 2 and 4 ("AuthUser"). */

export type UserRole = "OWNER" | "PROPERTY_MANAGER" | "TENANT";

/** GET /auth/me (AuthUser). firebaseUid is never returned. */
export interface Me {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** Permission keys, catalog order. OWNER: every key; PROPERTY_MANAGER: the granted keys; TENANT: []. */
  permissions: string[];
}

/** GET /settings/permissions item (OWNER only). Catalog order; more keys will be added, so never hard-code the list. */
export interface PermissionCatalogItem {
  /** e.g. "units.delete". */
  key: string;
  /** e.g. "Delete units". */
  label: string;
  /** "Properties", "Units", "Tenants", "Leases", "Money"; more later. */
  group: string;
  /** What a new manager gets. */
  default: boolean;
}

/** The only values of ApiError.code (../property-os-api/docs/frontend-handoff/API.md section 1, "Error body"). Other errors have no code. */
export type AuthErrorCode =
  | "MISSING_TOKEN"
  | "INVALID_TOKEN"
  | "EMAIL_NOT_VERIFIED"
  | "USER_NOT_REGISTERED"
  | "FORBIDDEN_ROLE"
  | "FORBIDDEN_PERMISSION"
  // POST /auth/register only. The admin portal never calls it (rules.md, Auth); listed so the union matches API.md.
  | "REGISTRATION_NOT_ALLOWED"
  | "OWNER_ALREADY_EXISTS";
