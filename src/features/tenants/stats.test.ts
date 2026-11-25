import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { buildTenantRows, currentLease, recentMoveOuts } from "@/features/tenants/stats";
import type { Lease } from "@/types/lease";
import type { TenantListItem } from "@/types/tenant";

const lease = (over: Partial<Lease> = {}) =>
  ({
    id: "l1",
    status: "ENDED",
    isHistorical: false,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    endedOn: null,
    cancelledOn: null,
    balance: "0.00",
    tenants: [{ id: "t1", fullName: "Ann", email: "ann@example.com", isPrimary: true }],
    ...over,
  }) as Lease;

const cancelled = (over: Partial<Lease> = {}) => lease({ id: "cancelled", startDate: "2027-01-01", endDate: "2027-12-31", cancelledOn: "2026-11-20", ...over });

describe("currentLease", () => {
  it("the closed lease that really ended last", () => {
    const early = lease({ id: "early", endDate: "2027-06-30", endedOn: "2026-03-01" });
    const late = lease({ id: "late", endDate: "2026-06-30", endedOn: "2026-06-30" });
    expect(currentLease([early, late])?.id).toBe("late");
  });

  it("a cancelled lease never wins over one that ran", () => {
    expect(currentLease([cancelled(), lease({ id: "ran", endDate: "2020-12-31" })])?.id).toBe("ran");
    expect(currentLease([cancelled()])?.id).toBe("cancelled");
  });

  it("active, then draft, come first", () => {
    const active = lease({ id: "active", status: "ACTIVE" });
    expect(currentLease([cancelled(), lease({ endedOn: "2026-11-01" }), active])?.id).toBe("active");
    expect(currentLease([lease({ endedOn: "2026-11-01" }), lease({ id: "draft", status: "DRAFT" })])?.id).toBe("draft");
  });
});

describe("recentMoveOuts", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-25T12:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const count = (...leases: Lease[]) => recentMoveOuts(buildTenantRows([{ id: "t1", fullName: "Ann" } as TenantListItem], leases));

  it("by the day it ended, not the planned end", () => {
    expect(count(lease({ endedOn: "2026-11-10" }))).toBe(1);
    expect(count(lease({ status: "TERMINATED", endedOn: "2026-11-25" }))).toBe(1);
    expect(count(lease({ endDate: "2026-11-10", endedOn: "2026-08-01" }))).toBe(0);
  });

  it("by the end date when the day isn't recorded", () => {
    expect(count(lease({ endDate: "2026-11-10" }))).toBe(1);
    expect(count(lease({ endDate: "2026-12-31" }))).toBe(0);
    expect(count(lease({ endDate: "2026-10-01" }))).toBe(0);
  });

  it("never a cancelled, old or active lease", () => {
    expect(count(cancelled())).toBe(0);
    expect(count(cancelled({ endDate: "2026-11-20", startDate: "2026-11-19" }))).toBe(0);
    expect(count(lease({ isHistorical: true, endDate: "2026-11-10" }))).toBe(0);
    expect(count(lease({ status: "ACTIVE", endDate: "2026-11-10" }))).toBe(0);
  });

  it("a later cancelled lease doesn't hide a real move-out", () => {
    expect(count(cancelled(), lease({ endedOn: "2026-11-10" }))).toBe(1);
  });
});
