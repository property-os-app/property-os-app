import { describe, expect, it } from "vitest";
import { tenantFromLease, tenantParent } from "@/features/tenants/origin";

describe("tenantParent", () => {
  it("from the Tenants list: back in history", () => {
    expect(tenantParent({ from: "tenants" })).toEqual({ parent: { label: "Tenants", to: "/tenants" }, nav: "tenants", backInHistory: true });
  });

  it("from a lease page or a unit page: names it", () => {
    expect(tenantParent({ from: "lease", lease: { id: "l 1", number: "LSE-2026-001" } })).toEqual({
      parent: { label: "Lease LSE-2026-001", to: "/leases/l%201" },
      nav: "leases",
      backInHistory: true,
    });
    expect(tenantParent({ from: "unit", unit: { id: "u1", name: "Unit 4B, Maple Court" } }).parent).toEqual({ label: "Unit 4B, Maple Court", to: "/units/u1" });
  });

  it("a pasted link: Tenants, not back in history", () => {
    expect(tenantParent(null)).toEqual({ parent: { label: "Tenants", to: "/tenants" }, nav: "tenants", backInHistory: false });
    expect(tenantParent({ from: "lease" }).parent.label).toBe("Tenants");
  });
});

describe("tenantParent from another tenant", () => {
  it("names that tenant and links back to them", () => {
    expect(tenantParent({ from: "tenant", tenant: { id: "t 2", name: "Ana Reyes" } })).toEqual({
      parent: { label: "Ana Reyes", to: "/tenants/t%202" },
      nav: "tenants",
      backInHistory: true,
    });
  });
});

describe("tenantFromLease", () => {
  it("builds the link", () => {
    expect(tenantFromLease("t1", { id: "l1", leaseNumber: "LSE-1" })).toEqual({ to: "/tenants/t1", state: { from: "lease", lease: { id: "l1", number: "LSE-1" } } });
  });
});
