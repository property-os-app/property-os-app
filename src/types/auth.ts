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
}

/** The only values of ApiError.code (../property-os-api/docs/frontend-handoff/API.md section 1, "Error body"). Other errors have no code. */
export type AuthErrorCode =
  | "MISSING_TOKEN"
  | "INVALID_TOKEN"
  | "EMAIL_NOT_VERIFIED"
  | "USER_NOT_REGISTERED"
  | "FORBIDDEN_ROLE";
