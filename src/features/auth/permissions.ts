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
  | "vendor.manage"
  | "expense.record"
  | "expense.approve"
  | "ticket.manage"
  | "ticket.cancel"
  | "access.manage";

/**
 * The backend permission key each action needs (API.md, Permissions). null = OWNER only, never a switch.
 * lease.edit also covers activate, end and delete draft, and picking a lease template; charge.create also covers billing a partial month.
 * template.manage covers every lease template write (create, new version, details, default, archive, delete, live preview).
 * vendor.manage covers create, edit, archive, unarchive and delete. expense.record only gates "Add Expense": every expense
 * button comes from the expense's allowedActions. entry.void (money.void) also voids expenses. ticket.manage only gates
 * "Add Ticket" (every ticket button comes from the ticket's allowedActions); ticket.cancel is off by default for managers.
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
  "vendor.manage": "vendors.manage",
  "expense.record": "expenses.record",
  "expense.approve": "expenses.approve",
  "ticket.manage": "maintenance.manage",
  "ticket.cancel": "maintenance.cancel",
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
