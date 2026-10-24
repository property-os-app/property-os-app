import { describe, expect, it } from "vitest";
import { rentDescription, rentProration } from "@/features/ledger/proration";

type ProrationLease = Parameters<typeof rentProration>[0];

const lease = (over: Partial<ProrationLease> = {}): ProrationLease => ({
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  rent: "1000.00",
  rentDueDay: 1,
  ...over,
});

describe("rentProration", () => {
  it("starts mid-month: from the start to the month's end", () => {
    const p = rentProration(lease({ startDate: "2026-10-14", endDate: "2027-10-13" }), "2026-10");
    // 100000 x 18 / 31 = 58064.52 -> 58065
    expect(p).toEqual({ from: "2026-10-14", to: "2026-10-31", days: 18, daysInMonth: 31, fullCents: 100000, proratedCents: 58065, dueOutsideTerm: true });
  });

  it("ends mid-month: from the 1st to the end date, due date inside the term", () => {
    const p = rentProration(lease({ endDate: "2026-10-20", rent: "1550.00" }), "2026-10");
    expect(p).toMatchObject({ from: "2026-10-01", to: "2026-10-20", days: 20, proratedCents: 100000, dueOutsideTerm: false });
  });

  it("starts and ends inside the month (February, 28 days)", () => {
    const p = rentProration(lease({ startDate: "2026-02-10", endDate: "2026-02-20", rent: "2800.00", rentDueDay: 15 }), "2026-02");
    expect(p).toMatchObject({ days: 11, daysInMonth: 28, proratedCents: 110000, dueOutsideTerm: false });
  });

  it("uses 29 days in a leap February", () => {
    const p = rentProration(lease({ startDate: "2028-02-15", endDate: "2029-02-14", rent: "2900.00" }), "2028-02");
    expect(p).toMatchObject({ days: 15, daysInMonth: 29, proratedCents: 150000 });
  });

  it("rounds half a cent up", () => {
    // 3 cents x 15 / 30 = 1.5 -> 2
    const p = rentProration(lease({ startDate: "2026-11-16", endDate: "2027-11-15", rent: "0.03" }), "2026-11");
    expect(p?.proratedCents).toBe(2);
  });

  it("rounds below half a cent down", () => {
    // 100 x 1 / 31 = 3.23 -> 3
    const p = rentProration(lease({ startDate: "2026-10-31", endDate: "2027-10-30", rent: "1.00" }), "2026-10");
    expect(p?.proratedCents).toBe(3);
  });

  it("due date: clamped to the month's last day; inside or outside the term", () => {
    expect(rentProration(lease({ startDate: "2026-10-14", rentDueDay: 15 }), "2026-10")?.dueOutsideTerm).toBe(false);
    expect(rentProration(lease({ startDate: "2026-02-10", rentDueDay: 31 }), "2026-02")?.dueOutsideTerm).toBe(false);
    expect(rentProration(lease({ endDate: "2026-10-20", rentDueDay: 25 }), "2026-10")?.dueOutsideTerm).toBe(true);
    expect(rentProration(lease({ startDate: "2026-10-14", rentDueDay: null }), "2026-10")?.dueOutsideTerm).toBe(true);
  });

  it("null when the lease covers the whole month", () => {
    expect(rentProration(lease(), "2026-10")).toBeNull();
    expect(rentProration(lease({ startDate: "2026-10-01", endDate: "2026-10-31" }), "2026-10")).toBeNull();
  });

  it("null when the lease doesn't touch the month", () => {
    expect(rentProration(lease(), "2027-01")).toBeNull();
    expect(rentProration(lease({ startDate: "2026-11-01" }), "2026-10")).toBeNull();
  });

  it("null without dates, rent or a valid month", () => {
    expect(rentProration(lease({ startDate: null }), "2026-10")).toBeNull();
    expect(rentProration(lease({ endDate: null }), "2026-10")).toBeNull();
    expect(rentProration(lease({ rent: null }), "2026-10")).toBeNull();
    expect(rentProration(lease({ startDate: "2026-10-14" }), "2026-13")).toBeNull();
  });
});

describe("rentDescription", () => {
  it("plain month", () => {
    expect(rentDescription("2026-10")).toBe("Monthly Rent - October 2026");
    expect(rentDescription("2026-10", null)).toBe("Monthly Rent - October 2026");
  });

  it("with the prorated days", () => {
    const p = rentProration(lease({ startDate: "2026-10-14", endDate: "2027-10-13" }), "2026-10");
    expect(rentDescription("2026-10", p)).toBe("Monthly Rent - October 2026 (prorated, Oct 14–Oct 31)");
  });
});
