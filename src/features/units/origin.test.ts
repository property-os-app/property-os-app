import { describe, expect, it } from "vitest";
import { rentRollYear, unitName, unitParent, unitPathFromRentRoll } from "@/features/units/origin";

const none = new URLSearchParams();

describe("unitParent", () => {
  it("from the Units list", () => {
    expect(unitParent({ from: "units" }, none)).toEqual({ parent: { label: "Units", to: "/units" }, nav: "units", backInHistory: true });
  });

  it("from a property page: its Units tab", () => {
    expect(unitParent({ from: "property", property: { id: "p1", name: "Maple Court" } }, none)).toEqual({
      parent: { label: "Maple Court", to: "/properties/p1?tab=units" },
      nav: "properties",
      backInHistory: true,
    });
  });

  it("from a lease page", () => {
    expect(unitParent({ from: "lease", lease: { id: "l1", number: "LSE-1" } }, none).parent).toEqual({ label: "Lease LSE-1", to: "/leases/l1" });
  });

  it("from the yearly Rent Roll, also as a pasted link", () => {
    const search = new URLSearchParams("from=rent-roll&view=year&year=2026");
    expect(unitParent({ from: "rent-roll" }, search)).toEqual({ parent: { label: "Rent Roll · 2026", to: "/rent-roll?view=year&year=2026" }, nav: "rentroll", backInHistory: true });
    expect(unitParent(null, search).backInHistory).toBe(false);
    expect(unitParent(null, search).parent.label).toBe("Rent Roll · 2026");
  });

  it("a pasted link without a year: Units", () => {
    expect(unitParent(null, none)).toEqual({ parent: { label: "Units", to: "/units" }, nav: "units", backInHistory: false });
    expect(rentRollYear(new URLSearchParams("from=rent-roll&view=year&year=20x6"))).toBeNull();
  });

  it("the Rent Roll link", () => {
    expect(unitPathFromRentRoll("u 1", "2026")).toBe("/units/u%201?from=rent-roll&view=year&year=2026");
  });
});

describe("unitName", () => {
  it("with and without the property", () => {
    expect(unitName("4B", "Maple Court")).toBe("Unit 4B, Maple Court");
    expect(unitName("4B", undefined)).toBe("Unit 4B");
  });
});
