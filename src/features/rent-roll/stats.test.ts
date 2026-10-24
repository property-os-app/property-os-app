import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  billingKind,
  canGenerateRent,
  collectionBreakdown,
  collectionNote,
  isFutureMonth,
  isPastMonth,
  lastGeneratableMonth,
  monthFromParam,
  owingCount,
  paidCaption,
  rowFilterStatus,
  rowTotals,
  skippedLeases,
  statusCounts,
  statusDate,
  upcomingCaption,
  upcomingRows,
} from "@/features/rent-roll/stats";
import { toCents } from "@/lib/format";
import type { Lease } from "@/types/lease";
import type { RentRollRow } from "@/types/rentRoll";

/* ---------- Hand-written fixtures (only the fields these helpers read matter) ---------- */

let nextId = 0;

function makeLease(over: Partial<Lease> = {}): Lease {
  const id = over.id ?? `lease-${++nextId}`;
  return {
    id,
    leaseNumber: `LSE-2026-${String(nextId).padStart(3, "0")}`,
    unitId: "unit-1",
    status: "ACTIVE",
    signatureStatus: "SIGNED",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    paymentFrequency: "MONTHLY",
    rent: "1000.00",
    deposit: "1000.00",
    lateFeeAmount: "0.00",
    lateFeeGraceDays: 0,
    rentDueDay: 1,
    autoRenew: false,
    tags: [],
    notes: null,
    createdById: "owner-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    unit: { id: "unit-1", unitNumber: "101", property: { id: "prop-1", name: "Maple Court" } },
    tenants: [],
    termMonths: 12,
    endingSoon: false,
    balance: "0.00",
    oldestUnpaidDueDate: null,
    ...over,
  };
}

const withTenant = (name: string): Pick<Lease, "tenants"> => ({ tenants: [{ id: `t-${name}`, fullName: name, email: "t@example.com", isPrimary: true }] });

function makeRow(over: Partial<RentRollRow> = {}): RentRollRow {
  return {
    leaseId: over.leaseId ?? `lease-${++nextId}`,
    leaseNumber: "LSE-2026-001",
    leaseStatus: "ACTIVE",
    unit: { id: "unit-1", unitNumber: "101", property: { id: "prop-1", name: "Maple Court" } },
    primaryTenant: { id: "t-1", fullName: "Grace Carter" },
    rent: "1000.00",
    depositHeld: "1000.00",
    dueDate: "2026-10-01",
    openingBalance: "0.00",
    charged: "1000.00",
    paid: "0.00",
    balance: "1000.00",
    oldestUnpaidDueDate: null,
    status: "UNPAID",
    lastPaymentDate: null,
    ...over,
  };
}

const at = (iso: string) => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  });
  afterEach(() => vi.useRealTimers());
};

/* ---------- Billing / Upcoming ---------- */

describe("billingKind", () => {
  it("in the backend's order", () => {
    // Not monthly wins even when the due date is outside the term.
    expect(billingKind("2026-10-01", makeLease({ paymentFrequency: "WEEKLY", startDate: "2026-10-14" }))).toBe("not-monthly");
    expect(billingKind("2026-10-01", makeLease({ startDate: "2026-10-14" }))).toBe("starts-late");
    expect(billingKind("2026-10-25", makeLease({ endDate: "2026-10-20" }))).toBe("ends-early");
    expect(billingKind("2026-10-01", makeLease())).toBe("generatable");
  });

  it("the start and end days themselves are billable", () => {
    expect(billingKind("2026-10-14", makeLease({ startDate: "2026-10-14" }))).toBe("generatable");
    expect(billingKind("2026-10-20", makeLease({ endDate: "2026-10-20" }))).toBe("generatable");
  });

  it("generatable without a lease or due date", () => {
    expect(billingKind("2026-10-01", undefined)).toBe("generatable");
    expect(billingKind(null, makeLease({ startDate: "2026-10-14" }))).toBe("generatable");
  });
});

describe("upcomingCaption", () => {
  it("starts late", () => {
    expect(upcomingCaption("starts-late", makeLease({ startDate: "2026-10-14" }), "2026-10")).toBe("Starts Oct 14 · first rent Nov 1");
  });
  it("ends early: Ended or Ends against today", () => {
    const l = makeLease({ endDate: "2026-10-20", rentDueDay: 25 });
    expect(upcomingCaption("ends-early", l, "2026-10", "2026-10-24")).toBe("Ended Oct 20 · no October rent due");
    expect(upcomingCaption("ends-early", l, "2026-10", "2026-10-10")).toBe("Ends Oct 20 · no October rent due");
  });
  it("not monthly", () => {
    expect(upcomingCaption("not-monthly", makeLease({ paymentFrequency: "BIWEEKLY" }), "2026-10")).toBe("Pays biweekly · add charges by hand");
  });
});

describe("upcomingRows / rowFilterStatus / statusCounts (NOT_BILLED classification)", () => {
  const startsLate = makeLease({ startDate: "2026-10-14", ...withTenant("Sophia Nguyen") });
  const billable = makeLease();
  const rows = [
    makeRow({ status: "PAID", paid: "1000.00", balance: "0.00" }),
    makeRow({ status: "PARTIAL", paid: "400.00", balance: "600.00" }),
    makeRow({ status: "UNPAID" }),
    makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-10-01" }),
    makeRow({ leaseId: billable.id, status: "NOT_BILLED", charged: "0.00", balance: "0.00" }),
    makeRow({ leaseId: startsLate.id, status: "NOT_BILLED", charged: "0.00", balance: "0.00" }),
    makeRow({ leaseId: "not-loaded", status: "NOT_BILLED", charged: "0.00", balance: "0.00" }),
  ];
  const upcoming = upcomingRows(rows, [startsLate, billable], "2026-10");

  it("only NOT_BILLED rows that Generate rent skips become Upcoming", () => {
    expect([...upcoming.keys()]).toEqual([startsLate.id]);
    expect(upcoming.get(startsLate.id)).toEqual({ kind: "starts-late", caption: "Starts Oct 14 · first rent Nov 1" });
  });

  it("a billed row of a late-starting lease is not Upcoming", () => {
    const paid = makeRow({ leaseId: startsLate.id, status: "PAID" });
    expect(upcomingRows([paid], [startsLate], "2026-10").size).toBe(0);
  });

  it("each row's segment", () => {
    expect(rows.map((r) => rowFilterStatus(r, upcoming))).toEqual(["PAID", "PARTIAL", "UNPAID", "OVERDUE", "NOT_BILLED", "UPCOMING", "NOT_BILLED"]);
    expect(rowFilterStatus(rows[5], null)).toBe("NOT_BILLED");
  });

  it("counts per segment; NOT_BILLED leaves out Upcoming rows", () => {
    expect(statusCounts(rows, upcoming)).toEqual({ all: 7, PAID: 1, PARTIAL: 1, UNPAID: 1, OVERDUE: 1, NOT_BILLED: 2, UPCOMING: 1 });
    expect(statusCounts(rows, null)).toMatchObject({ NOT_BILLED: 3, UPCOMING: 0 });
  });
});

describe("skippedLeases", () => {
  it("names the ACTIVE leases Generate rent skips, A→Z", () => {
    const leases = [
      makeLease({ paymentFrequency: "WEEKLY", ...withTenant("Zoe Park") }),
      makeLease({ startDate: "2026-10-14", ...withTenant("Sophia Nguyen") }),
      makeLease({ endDate: "2026-10-20", rentDueDay: 25, ...withTenant("Ava Lee") }),
      makeLease({ ...withTenant("Billable Person") }),
      makeLease({ status: "DRAFT", startDate: null, endDate: null, ...withTenant("Draft Person") }),
      makeLease({ startDate: "2026-11-14", endDate: "2027-11-13", ...withTenant("Next Month") }),
    ];
    expect(skippedLeases(leases, "2026-10", "2026-10-24")).toEqual([
      { name: "Ava Lee", reason: "ended Oct 20, no October rent due" },
      { name: "Sophia Nguyen", reason: "starts Oct 14, first rent Nov 1" },
      { name: "Zoe Park", reason: "pays weekly" },
    ]);
  });

  it("falls back to the lease number without a tenant", () => {
    const l = makeLease({ leaseNumber: "LSE-2026-042", startDate: "2026-10-14" });
    expect(skippedLeases([l], "2026-10", "2026-10-24")[0].name).toBe("LSE-2026-042");
  });

  it("empty for an invalid month", () => {
    expect(skippedLeases([makeLease({ paymentFrequency: "WEEKLY" })], "bad")).toEqual([]);
  });
});

/* ---------- Status date ---------- */

describe("statusDate", () => {
  at("2026-10-24T12:00:00Z");

  it("Paid / Partial: the last payment date", () => {
    expect(statusDate(makeRow({ status: "PAID", lastPaymentDate: "2026-10-03" }))).toEqual({ text: "Oct 3, 2026", tone: "default" });
    expect(statusDate(makeRow({ status: "PARTIAL", lastPaymentDate: null }))).toEqual({ text: null, tone: "default" });
  });

  it("Overdue: days since the oldest unpaid due date (at least 1)", () => {
    expect(statusDate(makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-10-01" }))).toEqual({ text: "23 days overdue", tone: "danger" });
    expect(statusDate(makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-10-23" })).text).toBe("1 day overdue");
    expect(statusDate(makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-09-01" })).text).toBe("53 days overdue");
  });

  it("Overdue in a past month: a snapshot, no day count", () => {
    expect(statusDate(makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-09-01" }), true)).toEqual({ text: "Unpaid at month end", tone: "danger" });
  });

  it("Unpaid: the due date; Not billed: muted", () => {
    expect(statusDate(makeRow({ status: "UNPAID", dueDate: "2026-11-01" }))).toEqual({ text: "Due Nov 1, 2026", tone: "default" });
    expect(statusDate(makeRow({ status: "UNPAID", dueDate: null })).text).toBeNull();
    expect(statusDate(makeRow({ status: "NOT_BILLED" }))).toEqual({ text: "Not billed yet", tone: "muted" });
  });

  describe("America/New_York, Oct 24 10 pm local", () => {
    beforeEach(() => {
      vi.stubEnv("TZ", "America/New_York");
      vi.setSystemTime(new Date("2026-10-25T02:00:00Z"));
    });
    it("counts local calendar days", () => {
      expect(statusDate(makeRow({ status: "OVERDUE", oldestUnpaidDueDate: "2026-10-01" })).text).toBe("23 days overdue");
    });
  });
});

/* ---------- Money: captions, totals, breakdown ---------- */

describe("paidCaption", () => {
  it("part of the payment went to the earlier balance", () => {
    expect(paidCaption(makeRow({ openingBalance: "900.00", paid: "1200.00" }))).toBe("incl. $900.00 toward earlier balance");
    expect(paidCaption(makeRow({ openingBalance: "900.00", paid: "500.00" }))).toBe("incl. $500.00 toward earlier balance");
  });
  it("covered by an earlier credit", () => {
    expect(paidCaption(makeRow({ openingBalance: "-1000.00", paid: "0.00", status: "PAID" }))).toBe("Covered by earlier credit");
  });
  it("null otherwise", () => {
    expect(paidCaption(makeRow({ openingBalance: "0.00", paid: "1000.00" }))).toBeNull();
    expect(paidCaption(makeRow({ openingBalance: "900.00", paid: "0.00" }))).toBeNull();
    expect(paidCaption(makeRow({ openingBalance: "-1000.00", paid: "0.00", status: "PARTIAL" }))).toBeNull();
  });
});

describe("rowTotals", () => {
  // Each row is consistent: balance = opening + charged - paid.
  const rows = [
    makeRow({ status: "PAID", openingBalance: "0.00", charged: "1000.00", paid: "1000.00", balance: "0.00" }),
    makeRow({ status: "PARTIAL", openingBalance: "900.00", charged: "1200.00", paid: "1500.00", balance: "600.00" }),
    makeRow({ status: "PAID", openingBalance: "-150.00", charged: "1000.00", paid: "1100.00", balance: "-250.00" }),
    makeRow({ status: "OVERDUE", openingBalance: "0.10", charged: "0.20", paid: "0.00", balance: "0.30" }),
    makeRow({ status: "NOT_BILLED", openingBalance: "0.00", charged: "0.00", paid: "0.00", balance: "0.00" }),
  ];
  const t = rowTotals(rows);
  const sum = (key: "openingBalance" | "charged" | "paid" | "balance") => rows.reduce((s, r) => s + toCents(r[key]), 0);

  it("collected = Σ paid, due = Σ charged, opening = Σ opening", () => {
    expect(t.paidCents).toBe(sum("paid"));
    expect(t.paidCents).toBe(360000);
    expect(t.chargedCents).toBe(sum("charged"));
    expect(t.chargedCents).toBe(320020);
    expect(t.openingCents).toBe(75010);
  });

  it("opening + charged − paid = balance (integer cents, no float drift)", () => {
    expect(t.openingCents + t.chargedCents - t.paidCents).toBe(sum("balance"));
    expect(t.owedCents - t.creditCents).toBe(sum("balance"));
  });

  it("splits positive balances (owed) from credits", () => {
    expect(t.owedCents).toBe(60030);
    expect(t.creditCents).toBe(25000);
  });

  it("billed counts every row except NOT_BILLED", () => {
    expect(t.billed).toBe(4);
  });

  it("all zero for no rows", () => {
    expect(rowTotals([])).toEqual({ billed: 0, openingCents: 0, chargedCents: 0, paidCents: 0, owedCents: 0, creditCents: 0 });
  });

  it("owingCount: rows with balance > 0", () => {
    expect(owingCount(rows)).toBe(2);
  });
});

describe("collectionBreakdown / collectionNote", () => {
  const rows = [
    // 900 owed from before, 1200 charged, 2500 paid: 900 to earlier, 400 in advance.
    makeRow({ openingBalance: "900.00", charged: "1200.00", paid: "2500.00" }),
    // A credit from before isn't "toward earlier"; 500 of 1000 paid, nothing in advance.
    makeRow({ openingBalance: "-100.00", charged: "1000.00", paid: "500.00" }),
    makeRow({ openingBalance: "0.00", charged: "1000.00", paid: "1000.00" }),
    // Paid less than the old balance: all of it went to earlier months.
    makeRow({ openingBalance: "300.00", charged: "1000.00", paid: "200.00" }),
  ];

  it("sums per row in integer cents", () => {
    expect(collectionBreakdown(rows)).toEqual({ towardEarlierCents: 110000, inAdvanceCents: 40000 });
  });

  it("note with both, one or no parts", () => {
    expect(collectionNote({ towardEarlierCents: 110000, inAdvanceCents: 40000 })).toBe("Includes $1,100.00 toward earlier balances and $400.00 paid in advance");
    expect(collectionNote({ towardEarlierCents: 0, inAdvanceCents: 5000 })).toBe("Includes $50.00 paid in advance");
    expect(collectionNote({ towardEarlierCents: 0, inAdvanceCents: 0 })).toBeNull();
  });
});

/* ---------- Months (UTC, the backend's month) ---------- */

describe("months", () => {
  describe("today 2026-10-24 (UTC)", () => {
    at("2026-10-24T12:00:00Z");
    it("monthFromParam keeps a valid month, else the current UTC month", () => {
      expect(monthFromParam("2026-07")).toBe("2026-07");
      expect(monthFromParam(null)).toBe("2026-10");
      expect(monthFromParam("2026-13")).toBe("2026-10");
    });
    it("rent can be generated up to next month", () => {
      expect(lastGeneratableMonth()).toBe("2026-11");
      expect(canGenerateRent("2025-01")).toBe(true);
      expect(canGenerateRent("2026-11")).toBe(true);
      expect(canGenerateRent("2026-12")).toBe(false);
      expect(canGenerateRent("bad")).toBe(false);
    });
    it("past and future months", () => {
      expect(isPastMonth("2026-09")).toBe(true);
      expect(isPastMonth("2026-10")).toBe(false);
      expect(isFutureMonth("2026-11")).toBe(true);
      expect(isFutureMonth("2026-10")).toBe(false);
    });
  });

  describe("America/New_York, Oct 31 11 pm local (Nov 1 UTC)", () => {
    beforeEach(() => vi.stubEnv("TZ", "America/New_York"));
    at("2026-11-01T03:00:00Z");
    it("follows the backend's UTC month, not the local one", () => {
      expect(monthFromParam(null)).toBe("2026-11");
      expect(isPastMonth("2026-10")).toBe(true);
      expect(lastGeneratableMonth()).toBe("2026-12");
    });
  });
});
