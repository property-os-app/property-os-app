import { describe, expect, it } from "vitest";
import { canEditEndDate, defaultEndedOn, endActionLabel, endedOnError, endedOnServerError, isNotStarted, leaseEndDate, splitEndedOnErrors } from "@/features/leases/leaseEnd";
import { compareLeasesDefault, friendlyLeaseMessage, leasePeriod } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

const TODAY = "2026-11-25";
const lease = (over: Partial<Lease> = {}) =>
  ({ status: "ENDED", isHistorical: false, startDate: "2026-01-01", endDate: "2026-12-31", endedOn: null, cancelledOn: null, createdAt: "2026-01-01T00:00:00Z", ...over }) as Lease;

describe("leaseEndDate and leasePeriod", () => {
  it("the day it ended, else the planned end", () => {
    expect(leaseEndDate(lease({ endedOn: "2026-10-23" }))).toBe("2026-10-23");
    expect(leaseEndDate(lease())).toBe("2026-12-31");
    expect(leasePeriod(lease({ endedOn: "2026-10-23" }))).toBe("Jan 1, 2026 to Oct 23, 2026");
    expect(leasePeriod(lease())).toBe("Jan 1, 2026 to Dec 31, 2026");
    expect(leasePeriod(lease({ status: "TERMINATED", endedOn: "2027-02-01" }))).toBe("Jan 1, 2026 to Feb 1, 2027");
  });

  it("an old lease and an active one use the end date", () => {
    expect(leaseEndDate(lease({ isHistorical: true, startDate: "2019-01-01", endDate: "2019-12-31" }))).toBe("2019-12-31");
    expect(leaseEndDate(lease({ status: "ACTIVE" }))).toBe("2026-12-31");
  });

  it("a cancelled lease has no period", () => {
    const l = lease({ startDate: "2027-01-01", endDate: "2027-12-31", cancelledOn: TODAY });
    expect(leaseEndDate(l)).toBe(TODAY);
    expect(leasePeriod(l)).toBe("Cancelled Nov 25, 2026");
  });

  it("drafts without dates", () => {
    const draft = lease({ status: "DRAFT", startDate: null, endDate: null });
    expect(leaseEndDate(draft)).toBeNull();
    expect(leasePeriod(draft)).toBeNull();
  });

  it("the default list order uses the real end, latest first", () => {
    const early = lease({ id: "early", endedOn: "2026-03-01" });
    const late = lease({ id: "late", endDate: "2026-06-30", endedOn: "2026-06-30" });
    const cancelled = lease({ id: "cancelled", startDate: "2027-01-01", endDate: "2028-12-31", cancelledOn: "2026-05-01" });
    expect([early, cancelled, late].sort(compareLeasesDefault).map((l) => l.id)).toEqual(["late", "cancelled", "early"]);
  });
});

describe("isNotStarted: ending it cancels it", () => {
  it("only an ACTIVE lease that starts after today (UTC)", () => {
    expect(isNotStarted(lease({ status: "ACTIVE", startDate: "2026-11-26" }), TODAY)).toBe(true);
    expect(isNotStarted(lease({ status: "ACTIVE", startDate: TODAY }), TODAY)).toBe(false);
    expect(isNotStarted(lease({ status: "DRAFT", startDate: "2026-11-26" }), TODAY)).toBe(false);
    expect(isNotStarted(lease({ status: "ENDED", startDate: "2026-11-26" }), TODAY)).toBe(false);
  });

  it("names the action", () => {
    expect(endActionLabel(lease({ status: "ACTIVE", startDate: "9999-01-01" }))).toBe("Cancel lease");
    expect(endActionLabel(lease({ status: "ACTIVE", startDate: "2020-01-01" }))).toBe("End lease");
  });
});

describe("canEditEndDate", () => {
  it("ended and terminated leases, with or without a date", () => {
    expect(canEditEndDate(lease(), TODAY)).toBe(true);
    expect(canEditEndDate(lease({ status: "TERMINATED", endedOn: "2026-10-23" }), TODAY)).toBe(true);
    expect(canEditEndDate(lease({ startDate: TODAY }), TODAY)).toBe(true);
  });

  it("never drafts, active, old, cancelled or not started leases", () => {
    expect(canEditEndDate(lease({ status: "DRAFT" }), TODAY)).toBe(false);
    expect(canEditEndDate(lease({ status: "ACTIVE" }), TODAY)).toBe(false);
    expect(canEditEndDate(lease({ isHistorical: true }), TODAY)).toBe(false);
    expect(canEditEndDate(lease({ cancelledOn: TODAY }), TODAY)).toBe(false);
    expect(canEditEndDate(lease({ startDate: "2026-11-26" }), TODAY)).toBe(false);
  });
});

describe("the date rules", () => {
  it("from the start date to today, both included", () => {
    expect(endedOnError("2026-01-01", "2026-01-01", TODAY)).toBeNull();
    expect(endedOnError(TODAY, "2026-01-01", TODAY)).toBeNull();
    expect(endedOnError("2026-11-26", "2026-01-01", TODAY)).toBe("The end date can't be after today.");
    expect(endedOnError("2025-12-31", "2026-01-01", TODAY)).toBe("The end date can't be before the start date (Jan 1, 2026).");
  });

  it("required, and a real date", () => {
    expect(endedOnError("", "2026-01-01", TODAY)).toBe("Choose the end date.");
    expect(endedOnError("2026-02-30", "2026-01-01", TODAY)).toBe("Use a full date.");
    expect(endedOnError("2026-2", null, TODAY)).toBe("Use a full date.");
  });

  it("the default is today, never after UTC today and never before the start", () => {
    const noon = new Date("2026-11-25T12:00:00Z");
    expect(defaultEndedOn("2026-01-01", noon)).toBe(TODAY);
    // Near UTC midnight the local day can be the day before or after; the default is never after UTC today.
    expect(defaultEndedOn("2026-01-01", new Date("2026-11-25T23:59:00Z")) <= TODAY).toBe(true);
    expect(defaultEndedOn("2026-01-01", new Date("2026-11-25T00:01:00Z")) <= TODAY).toBe(true);
    expect(defaultEndedOn(TODAY, new Date("2026-11-25T00:01:00Z"))).toBe(TODAY);
    expect(endedOnError(defaultEndedOn(TODAY, noon), TODAY, TODAY)).toBeNull();
  });
});

describe("backend messages", () => {
  it("400s about the date, for under the field", () => {
    expect(endedOnServerError("endedOn must not be before startDate (2026-10-01)")).toBe("End date must not be before the start date (Oct 1, 2026)");
    expect(endedOnServerError("endedOn must not be after today")).toBe("End date must not be after today");
    expect(endedOnServerError("Cannot end lease LSE-1: it is already ENDED.")).toBeNull();
  });

  it("splits them from the rest", () => {
    expect(splitEndedOnErrors(["endedOn must not be after today", "status must be ENDED or TERMINATED"])).toEqual({
      field: "End date must not be after today",
      form: "status must be ENDED or TERMINATED",
    });
    expect(splitEndedOnErrors(["Lease L-1 is ACTIVE, so endedOn can't be set. It is set when the lease is ended."], friendlyLeaseMessage)).toEqual({
      field: "",
      form: "Lease L-1 is ACTIVE, so the end date can't be set. It is set when the lease is ended.",
    });
  });

  it("reads both closed-lease 409s", () => {
    expect(friendlyLeaseMessage("Lease L-1 is ENDED, so only notes, tags and endedOn can be changed. Not allowed: rent, startDate.")).toBe(
      "Lease L-1 is ended, so only notes, tags and the end date can change. Not allowed: Monthly rent, Start date.",
    );
    expect(friendlyLeaseMessage("Lease L-1 is TERMINATED, so only notes and tags can be changed. Not allowed: endedOn.")).toBe(
      "Lease L-1 is terminated, so only notes and tags can change. Not allowed: Date it ended.",
    );
  });
});
