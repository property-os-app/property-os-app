import { describe, expect, it } from "vitest";
import { can, roleLabel, toSidebarRole, type Action } from "@/features/auth/permissions";
import type { Me } from "@/types/auth";

const ACTIONS: Action[] = [
  "property.create",
  "property.edit",
  "property.delete",
  "manager.assign",
  "unit.create",
  "unit.edit",
  "unit.delete",
  "tenant.create",
  "tenant.edit",
  "tenant.delete",
  "lease.create",
  "lease.edit",
  "charge.create",
  "payment.create",
  "rent.generate",
  "entry.void",
  "access.manage",
];

const ALL_KEYS = ["properties.create", "properties.edit", "units.create_edit", "units.delete", "tenants.create_edit", "tenants.delete", "leases.manage", "money.record", "money.void"];

const user = (role: Me["role"], permissions: string[] = []): Pick<Me, "role" | "permissions"> => ({ role, permissions });

describe("can", () => {
  it("OWNER can do everything, even with no keys", () => {
    for (const a of ACTIONS) expect(can(user("OWNER"), a)).toBe(true);
  });

  it("TENANT can do nothing, even with keys", () => {
    for (const a of ACTIONS) expect(can(user("TENANT", ALL_KEYS), a)).toBe(false);
  });

  it("a manager with no keys can do nothing", () => {
    for (const a of ACTIONS) expect(can(user("PROPERTY_MANAGER"), a)).toBe(false);
  });

  it("a manager needs the matching key", () => {
    const m = user("PROPERTY_MANAGER", ["units.create_edit", "money.record"]);
    expect(can(m, "unit.create")).toBe(true);
    expect(can(m, "unit.edit")).toBe(true);
    expect(can(m, "unit.delete")).toBe(false);
    expect(can(m, "charge.create")).toBe(true);
    expect(can(m, "payment.create")).toBe(true);
    expect(can(m, "rent.generate")).toBe(true);
    expect(can(m, "entry.void")).toBe(false);
    expect(can(m, "tenant.edit")).toBe(false);
  });

  it("each action maps to its key", () => {
    const pairs: [Action, string][] = [
      ["property.create", "properties.create"],
      ["property.edit", "properties.edit"],
      ["tenant.create", "tenants.create_edit"],
      ["tenant.delete", "tenants.delete"],
      ["lease.create", "leases.manage"],
      ["lease.edit", "leases.manage"],
      ["entry.void", "money.void"],
    ];
    for (const [action, key] of pairs) expect(can(user("PROPERTY_MANAGER", [key]), action)).toBe(true);
  });

  it("OWNER-only actions stay off for a manager with every key", () => {
    const m = user("PROPERTY_MANAGER", ALL_KEYS);
    expect(can(m, "property.delete")).toBe(false);
    expect(can(m, "manager.assign")).toBe(false);
    expect(can(m, "access.manage")).toBe(false);
  });

  it("unknown keys grant nothing", () => {
    for (const a of ACTIONS) expect(can(user("PROPERTY_MANAGER", ["reports.view"]), a)).toBe(false);
  });
});

describe("roles", () => {
  it("toSidebarRole", () => {
    expect(toSidebarRole("OWNER")).toBe("admin");
    expect(toSidebarRole("PROPERTY_MANAGER")).toBe("manager");
  });
  it("roleLabel gives a display name", () => {
    expect(roleLabel("OWNER")).toBe("Owner");
    expect(roleLabel("PROPERTY_MANAGER")).toBe("Property Manager");
  });
});
