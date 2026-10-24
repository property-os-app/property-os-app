import type { Role } from "@/components/organisms";
import { userRoleLabels } from "@/lib/labels";
import type { Me, UserRole } from "@/types/auth";

/** Things a user may do. The UI hides what a user can't do (never disables). The backend is the real guard. */
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
  | "rent.generate"
  | "entry.void"
  | "template.manage"
  | "access.manage";

/**
 * The backend permission key each action needs (API.md, Permissions). null = OWNER only, never a switch.
 * lease.edit also covers activate, end and delete draft, and picking a lease template; charge.create also covers billing a partial month.
 * template.manage covers every lease template write (create, new version, details, default, archive, delete, live preview).
 */
const ACTION_KEYS: Record<Action, string | null> = {
  "property.create": "properties.create",
  "property.edit": "properties.edit",
  "property.delete": null,
  "manager.assign": null,
  "unit.create": "units.create_edit",
  "unit.edit": "units.create_edit",
  "unit.delete": "units.delete",
  "tenant.create": "tenants.create_edit",
  "tenant.edit": "tenants.create_edit",
  "tenant.delete": "tenants.delete",
  "lease.create": "leases.manage",
  "lease.edit": "leases.manage",
  "charge.create": "money.record",
  "payment.create": "money.record",
  "rent.generate": "money.record",
  "entry.void": "money.void",
  "template.manage": "templates.manage",
  "access.manage": null,
};

/** True when the user may do the action. OWNER: everything. PROPERTY_MANAGER: only actions whose key is in `permissions` (GET /auth/me). TENANT: nothing. */
export function can(me: Pick<Me, "role" | "permissions">, action: Action): boolean {
  if (me.role === "OWNER") return true;
  if (me.role !== "PROPERTY_MANAGER") return false;
  const key = ACTION_KEYS[action];
  return key !== null && me.permissions.includes(key);
}

/** Design system Sidebar role: OWNER -> "admin", PROPERTY_MANAGER -> "manager". TENANT never reaches the app layout. */
export function toSidebarRole(role: UserRole): Role {
  return role === "OWNER" ? "admin" : "manager";
}

/** Display name of a role. */
export function roleLabel(role: UserRole): string {
  return userRoleLabels[role];
}
