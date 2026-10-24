import { describe, expect, it } from "vitest";
import { defaultKeys, groupCatalog, managerPropertyNames, sameSet, scopeText } from "@/features/settings/access";
import type { PermissionCatalogItem } from "@/types/auth";
import type { ManagerListItem } from "@/types/manager";
import type { Property } from "@/types/property";

const item = (key: string, group: string, isDefault = false): PermissionCatalogItem => ({ key, label: key, group, default: isDefault });

const catalog = [
  item("units.create_edit", "Units", true),
  item("units.delete", "Units"),
  item("money.record", "Money", true),
  item("tenants.create_edit", "Tenants", true),
  item("money.void", "Money"),
];

const property = (id: string, name: string, managerIds: string[]): Property => ({
  id,
  name,
  street: "1 Main St",
  city: "Austin",
  state: "TX",
  zip: "78701",
  propertyType: "RESIDENTIAL",
  propertyValue: "250000.00",
  acquisitionDate: "2020-01-01",
  description: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  unitCount: 4,
  managers: managerIds.map((m) => ({ id: m, name: m })),
});

const manager = (id: string, assignedPropertyCount: number): ManagerListItem => ({ id, email: `${id}@example.com`, name: id, assignedPropertyCount });

describe("groupCatalog", () => {
  it("groups in the order the API sends them", () => {
    expect(groupCatalog(catalog).map((g) => [g.group, g.items.map((i) => i.key)])).toEqual([
      ["Units", ["units.create_edit", "units.delete"]],
      ["Money", ["money.record", "money.void"]],
      ["Tenants", ["tenants.create_edit"]],
    ]);
  });
  it("empty catalog", () => {
    expect(groupCatalog([])).toEqual([]);
  });
});

describe("defaultKeys / sameSet", () => {
  it("the keys a new manager gets", () => {
    expect([...defaultKeys(catalog)]).toEqual(["units.create_edit", "money.record", "tenants.create_edit"]);
  });
  it("compares sets by value, not order", () => {
    expect(sameSet(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(true);
    expect(sameSet(new Set(["a"]), new Set(["a", "b"]))).toBe(false);
    expect(sameSet(new Set(["a", "c"]), new Set(["a", "b"]))).toBe(false);
    expect(sameSet(new Set(), new Set())).toBe(true);
  });
});

describe("managerPropertyNames / scopeText", () => {
  const properties = [
    property("p1", "Willow Lofts", ["m1", "m2"]),
    property("p2", "Cedar House", ["m1"]),
    property("p3", "Aspen Row", ["m1"]),
    property("p4", "Birch Court", ["m2"]),
  ];

  it("names A→Z", () => {
    expect(managerPropertyNames("m1", properties)).toEqual(["Aspen Row", "Cedar House", "Willow Lofts"]);
    expect(managerPropertyNames("m3", properties)).toEqual([]);
  });

  it("none, up to 2 names, or a count", () => {
    expect(scopeText(manager("m3", 0), properties)).toBe("No properties");
    expect(scopeText(manager("m2", 2), properties)).toBe("Birch Court, Willow Lofts");
    expect(scopeText(manager("m1", 3), properties)).toBe("3 properties");
    expect(scopeText(manager("m4", 1), [property("p9", "Solo", ["m4"])])).toBe("Solo");
  });

  it("falls back to assignedPropertyCount while properties load", () => {
    expect(scopeText(manager("m1", 0), undefined)).toBe("No properties");
    expect(scopeText(manager("m1", 1), undefined)).toBe("1 property");
    expect(scopeText(manager("m1", 5), undefined)).toBe("5 properties");
  });
});
