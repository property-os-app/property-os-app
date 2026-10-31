import { describe, expect, it } from "vitest";
import { balanceSplit } from "@/features/ledger/overdue";
import type { LedgerEntry } from "@/types/ledger";

const TODAY = "2026-10-24";

const charge = (date: string, amount: string, voided = false) => ({
  kind: "CHARGE" as const,
  voided,
  date,
  amount,
});
const payment = (date: string, amount: string): Pick<LedgerEntry, "kind" | "voided" | "date" | "amount"> => ({
  kind: "PAYMENT",
  voided: false,
  date,
  amount,
});

describe("balanceSplit", () => {
  it("a bill created early is not overdue", () => {
    // October paid; November billed on Oct 18, due Nov 1.
    const entries = [charge("2026-10-01", "1200.00"), payment("2026-10-02", "1200.00"), charge("2026-11-01", "1200.00")];
    expect(balanceSplit(entries, "1200.00", TODAY)).toEqual({
      overdueCents: 0,
      notDueCents: 120000,
    });
  });

  it("an unpaid past month is overdue, next month's bill is not due yet", () => {
    const entries = [charge("2026-10-01", "1200.00"), charge("2026-11-01", "1200.00")];
    expect(balanceSplit(entries, "2400.00", TODAY)).toEqual({
      overdueCents: 120000,
      notDueCents: 120000,
    });
  });

  it("partly paid: payments cover the oldest charge first", () => {
    const entries = [charge("2026-10-01", "1200.00"), payment("2026-10-05", "500.00"), charge("2026-11-01", "1200.00")];
    expect(balanceSplit(entries, "1900.00", TODAY)).toEqual({
      overdueCents: 70000,
      notDueCents: 120000,
    });
  });

  it("a charge due today is neither overdue nor 'not due yet'", () => {
    expect(balanceSplit([charge(TODAY, "75.00")], "75.00", TODAY)).toEqual({
      overdueCents: 0,
      notDueCents: 0,
    });
  });

  it("voided charges don't count", () => {
    const entries = [charge("2026-10-01", "1200.00"), charge("2026-11-01", "1200.00", true)];
    expect(balanceSplit(entries, "1200.00", TODAY)).toEqual({
      overdueCents: 120000,
      notDueCents: 0,
    });
  });

  it("a credit or nothing owed: both 0", () => {
    expect(balanceSplit([charge("2026-11-01", "1200.00")], "-50.00", TODAY)).toEqual({ overdueCents: 0, notDueCents: 0 });
    expect(balanceSplit([], "0.00", TODAY)).toEqual({
      overdueCents: 0,
      notDueCents: 0,
    });
  });

  it("a credit that partly covers a future bill: not due yet is capped at the balance", () => {
    const entries = [payment("2026-10-20", "200.00"), charge("2026-11-01", "1200.00")];
    expect(balanceSplit(entries, "1000.00", TODAY)).toEqual({
      overdueCents: 0,
      notDueCents: 100000,
    });
  });
});
