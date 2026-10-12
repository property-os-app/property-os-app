import type { Role } from "@/components/organisms";
import { userRoleLabels } from "@/lib/labels";
import type { UserRole } from "@/types/auth";

/** Things a role may do. The UI hides what a role can't do (never disables). The backend is the real guard. */
export type Action =
  | "property.create"
  | "property.edit"
  | "property.delete"
  | "manager.assign"
  | "unit.create"
  | "unit.edit"
  | "unit.delete"
  | "tenant.create"
  | "tenant.edit"
  | "tenant.delete"
  | "lease.create"
  | "lease.edit"
  | "charge.create"
  | "payment.create"
  | "entry.void";

const MANAGER_CANNOT: Action[] = [
  "property.create",
  "property.edit",
  "property.delete",
  "manager.assign",
  "unit.delete",
  "tenant.delete",
  "entry.void",
];

/** True when the role may do the action. OWNER: everything. PROPERTY_MANAGER: all but MANAGER_CANNOT. TENANT: nothing. */
export function can(role: UserRole, action: Action): boolean {
  if (role === "OWNER") return true;
  if (role === "PROPERTY_MANAGER") return !MANAGER_CANNOT.includes(action);
  return false;
}

/** Design system Sidebar role: OWNER -> "admin", PROPERTY_MANAGER -> "manager". TENANT never reaches the app layout. */
export function toSidebarRole(role: UserRole): Role {
  return role === "OWNER" ? "admin" : "manager";
}

/** Display name of a role. */
export function roleLabel(role: UserRole): string {
  return userRoleLabels[role];
}
