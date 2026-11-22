import { describe, expect, it } from "vitest";
import { canDeleteLease, dueState, hasLedger, isOldLease, notDueCaption } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

const TODAY = "2026-10-24";

/** Only the fields dueState reads matter. */
const lease = (balance: string, oldestUnpaidDueDate: string | null) => ({ balance, oldestUnpaidDueDate }) as Lease;

describe("dueState: a balance above $0 is not late by itself", () => {
  it("rent billed early (due later) is not overdue", () => {
    expect(dueState(lease("1200.00", "2026-11-01"), TODAY)).toEqual({
      kind: "future",
      next: "2026-11-01",
    });
  });

  it("overdue only when the oldest unpaid due date is before today (UTC)", () => {
    expect(dueState(lease("1200.00", "2026-10-23"), TODAY)).toEqual({
      kind: "overdue",
      since: "2026-10-23",
    });
    expect(dueState(lease("1200.00", TODAY), TODAY)).toEqual({ kind: "today" });
  });

  it("credit and nothing owed", () => {
    expect(dueState(lease("-50.00", null), TODAY)).toEqual({ kind: "credit" });
    expect(dueState(lease("0.00", null), TODAY)).toEqual({ kind: "none" });
  });
});

describe("notDueCaption", () => {
  it('"Due Nov 1" when nothing is late yet', () => {
    expect(notDueCaption(lease("1200.00", "2026-11-01"), TODAY)).toBe("Due Nov 1");
    expect(notDueCaption(lease("1200.00", TODAY), TODAY)).toBe("Due today");
  });

  it("null when overdue, credit or nothing owed", () => {
    expect(notDueCaption(lease("1200.00", "2026-10-01"), TODAY)).toBeNull();
    expect(notDueCaption(lease("-50.00", null), TODAY)).toBeNull();
    expect(notDueCaption(lease("0.00", null), TODAY)).toBeNull();
  });
});

describe("old (history-only) lease rules", () => {
  const old = { status: "ENDED", isHistorical: true } as const;
  const ended = { status: "ENDED", isHistorical: false } as const;
  const draft = { status: "DRAFT", isHistorical: false } as const;
  const active = { status: "ACTIVE", isHistorical: false } as const;

  it("isOldLease follows isHistorical", () => {
    expect(isOldLease(old)).toBe(true);
    expect(isOldLease(ended)).toBe(false);
  });

  it("no ledger on a draft or an old lease", () => {
    expect(hasLedger(old)).toBe(false);
    expect(hasLedger(draft)).toBe(false);
    expect(hasLedger(active)).toBe(true);
    expect(hasLedger(ended)).toBe(true);
  });

  it("delete only drafts and old leases, and only with no documents", () => {
    expect(canDeleteLease(old, 0)).toBe(true);
    expect(canDeleteLease(old, 1)).toBe(false);
    expect(canDeleteLease(old, undefined)).toBe(false);
    expect(canDeleteLease(draft, 0)).toBe(true);
    expect(canDeleteLease(draft, 2)).toBe(false);
    expect(canDeleteLease(ended, 0)).toBe(false);
    expect(canDeleteLease(active, 0)).toBe(false);
  });
});
