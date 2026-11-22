import { describe, expect, it } from "vitest";
import { emptyOldLease, lastOldLeaseEnd, oldLeaseBody, oldLeaseErrorField, validateOldLease, type OldLeaseValues } from "@/features/leases/oldLeaseForm";

const TODAY = "2026-11-21";
const filled = (over: Partial<OldLeaseValues> = {}): OldLeaseValues => ({
  ...emptyOldLease({ propertyId: "p1", unitId: "u1" }),
  primaryTenantId: "t1",
  startDate: "2019-01-01",
  endDate: "2019-12-31",
  ...over,
});

describe("validateOldLease", () => {
  it("accepts a complete old lease", () => {
    expect(validateOldLease(filled(), TODAY)).toEqual({});
  });

  it("needs a unit, a primary tenant and both dates", () => {
    expect(validateOldLease(emptyOldLease(), TODAY)).toEqual({
      unitId: "Choose a unit.",
      primaryTenantId: "Choose the primary tenant.",
      startDate: "Enter the start date.",
      endDate: "Enter the end date.",
    });
  });

  it("the end date must be before today (UTC) and after the start", () => {
    expect(validateOldLease(filled({ endDate: TODAY }), TODAY).endDate).toBe("An old lease must end before today.");
    expect(validateOldLease(filled({ endDate: "2026-11-20" }), TODAY).endDate).toBeUndefined();
    expect(validateOldLease(filled({ startDate: "2019-12-31" }), TODAY).endDate).toBe("The end date must be after the start date.");
    expect(validateOldLease(filled({ startDate: "2020-01-01" }), TODAY).endDate).toBe("The end date must be after the start date.");
  });

  it("primary tenant can't be a co-tenant", () => {
    expect(validateOldLease(filled({ coTenantIds: ["t1"] }), TODAY).coTenantIds).toBeDefined();
  });

  it("lastOldLeaseEnd is yesterday", () => {
    expect(lastOldLeaseEnd(TODAY)).toBe("2026-11-20");
    expect(lastOldLeaseEnd("2026-03-01")).toBe("2026-02-28");
  });
});

describe("oldLeaseBody", () => {
  it("sends only the required fields when nothing else is filled", () => {
    expect(oldLeaseBody(filled())).toEqual({ unitId: "u1", primaryTenantId: "t1", startDate: "2019-01-01", endDate: "2019-12-31" });
  });

  it("adds the optional fields when filled; never the property, status or e-sign", () => {
    const body = oldLeaseBody(filled({ coTenantIds: ["t2"], rent: 950, deposit: 0, notes: "  Paper files  ", tags: ["Paper Lease"] }));
    expect(body).toEqual({
      unitId: "u1",
      primaryTenantId: "t1",
      coTenantIds: ["t2"],
      startDate: "2019-01-01",
      endDate: "2019-12-31",
      rent: 950,
      deposit: 0,
      notes: "Paper files",
      tags: ["Paper Lease"],
    });
    expect(Object.keys(body)).not.toContain("propertyId");
  });

  it("leaves blank notes out", () => {
    expect(oldLeaseBody(filled({ notes: "   " })).notes).toBeUndefined();
  });
});

describe("oldLeaseErrorField", () => {
  it("puts date and overlap messages under End date", () => {
    expect(oldLeaseErrorField("endDate must be before today for a history-only lease")).toBe("endDate");
    expect(oldLeaseErrorField("Unit already has a lease (LSE-2026-003, ACTIVE, 2026-01-01 to 2026-12-31) overlapping these dates. Change the dates.")).toBe("endDate");
  });

  it("tenant messages under Primary tenant; others at the top", () => {
    expect(oldLeaseErrorField("Tenant t1 can't be both the primary tenant and a co-tenant")).toBe("primaryTenantId");
    expect(oldLeaseErrorField("You do not have access to this property")).toBeNull();
  });
});
