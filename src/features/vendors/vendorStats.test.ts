import { describe, expect, it } from "vitest";
import { averageRating, initialVendorFilters, matchesVendorFilters, maybeDeletable, serviceAreas, vendorKpis } from "@/features/vendors/vendorStats";
import type { Vendor } from "@/types/vendor";

const vendor = (over: Partial<Vendor>): Vendor => ({
  id: "v",
  name: "V",
  trade: "PLUMBING",
  contactName: null,
  phone: null,
  email: null,
  serviceArea: null,
  licenseNumber: null,
  insuranceProvider: null,
  insurancePolicyNumber: null,
  notes: null,
  rateAmount: null,
  rateUnit: null,
  insuranceExpiresOn: null,
  insuranceStatus: "NONE",
  archivedAt: null,
  expenseCount: 0,
  rating: null,
  ratingCount: 0,
  jobsCount: 0,
  activeTickets: 0,
  createdById: "u",
  createdBy: { id: "u", name: "Owner" },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

const list = [
  vendor({ id: "1", trade: "HVAC", insuranceStatus: "EXPIRED", serviceArea: "Downtown" }),
  vendor({ id: "2", trade: "PLUMBING", insuranceStatus: "EXPIRING", serviceArea: "downtown " }),
  vendor({ id: "3", trade: "PLUMBING", insuranceStatus: "NONE", serviceArea: "North side" }),
  vendor({ id: "4", trade: "ELECTRICAL", insuranceStatus: "VALID" }),
  vendor({ id: "5", trade: "ROOFING", insuranceStatus: "EXPIRED", archivedAt: "2026-09-01T00:00:00.000Z", serviceArea: "Airport" }),
];

describe("vendorKpis", () => {
  it("counts active vendors only", () => {
    expect(vendorKpis(list)).toEqual({
      total: 4,
      trades: 3,
      expiring: 1,
      expired: 1,
      none: 1,
      activeJobs: 0,
      vendorsWithJobs: 0,
      averageRating: null,
      ratingCount: 0,
    });
  });

  it("is all zero for no vendors", () => {
    expect(vendorKpis([])).toEqual({
      total: 0,
      trades: 0,
      expiring: 0,
      expired: 0,
      none: 0,
      activeJobs: 0,
      vendorsWithJobs: 0,
      averageRating: null,
      ratingCount: 0,
    });
  });
});

describe("serviceAreas", () => {
  it("lists each area once ignoring case, A to Z", () => {
    expect(serviceAreas(list)).toEqual(["Airport", "Downtown", "North side"]);
  });
});

describe("matchesVendorFilters", () => {
  it("hides archived vendors unless shown", () => {
    expect(matchesVendorFilters(list[4], initialVendorFilters)).toBe(false);
    expect(matchesVendorFilters(list[4], { ...initialVendorFilters, show: "all" })).toBe(true);
  });

  it("matches trade, insurance and area (ignoring case)", () => {
    const f = { ...initialVendorFilters, trade: "PLUMBING", area: "Downtown" };
    expect(list.filter((v) => matchesVendorFilters(v, f)).map((v) => v.id)).toEqual(["2"]);
    expect(list.filter((v) => matchesVendorFilters(v, { ...initialVendorFilters, insurance: "EXPIRED" })).map((v) => v.id)).toEqual(["1"]);
  });
});

describe("ticket stats", () => {
  it("active jobs over active vendors only", () => {
    const k = vendorKpis([
      vendor({ activeTickets: 2 }),
      vendor({ activeTickets: 0 }),
      vendor({ activeTickets: 1 }),
      vendor({ activeTickets: 5, archivedAt: "2026-09-01T00:00:00.000Z" }),
    ]);
    expect(k.activeJobs).toBe(3);
    expect(k.vendorsWithJobs).toBe(2);
  });

  it("average rating weighted by ratingCount, 1 decimal", () => {
    expect(averageRating([vendor({ rating: 5, ratingCount: 1 }), vendor({ rating: 4, ratingCount: 3 }), vendor({ rating: null, ratingCount: 0 })])).toEqual({
      average: 4.3,
      count: 4,
    });
    expect(averageRating([vendor({ rating: 4.7, ratingCount: 2 })])).toEqual({ average: 4.7, count: 2 });
  });

  it("null when nobody is rated", () => {
    expect(averageRating([vendor({})])).toEqual({ average: null, count: 0 });
    expect(vendorKpis([]).averageRating).toBeNull();
  });
});

describe("maybeDeletable", () => {
  it("only without expenses, jobs or active tickets", () => {
    expect(maybeDeletable(vendor({}))).toBe(true);
    expect(maybeDeletable(vendor({ expenseCount: 1 }))).toBe(false);
    expect(maybeDeletable(vendor({ jobsCount: 1 }))).toBe(false);
    expect(maybeDeletable(vendor({ activeTickets: 1 }))).toBe(false);
  });
});
