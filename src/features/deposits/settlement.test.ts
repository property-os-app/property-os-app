import { describe, expect, it } from "vitest";
import {
  canSaveSettlement,
  leftToAssignCents,
  leftToAssignView,
  newDeduction,
  settlementBody,
  settlementDefaults,
  settlementErrors,
  splitSettlementErrors,
  type SettlementContext,
  type SettlementValues,
} from "@/features/deposits/settlement";
import type { DepositResponse } from "@/types/deposit";

const ctx: SettlementContext = { totalHeld: "3000.00", maxApplicable: "50.00", minSettledOn: "2026-09-30", today: "2026-11-26" };

function values(over: Partial<SettlementValues> = {}): SettlementValues {
  return {
    settledOn: "2026-11-26",
    deductions: [],
    appliedToBalance: 0,
    refundAmount: 3000,
    refundDate: "",
    refundMethod: "",
    refundReference: "",
    notes: "",
    ...over,
  };
}

const unsettled: Pick<DepositResponse, "settlement" | "suggested" | "totalHeld"> = {
  totalHeld: "3000.00",
  settlement: null,
  suggested: { deductions: [], appliedToBalance: "0.00", refundAmount: "3000.00" },
};

describe("settlementDefaults", () => {
  it("prefills from suggested: the whole deposit as a refund, settled today", () => {
    const v = settlementDefaults(unsettled, "2026-11-26");
    expect(v).toMatchObject({ settledOn: "2026-11-26", deductions: [], appliedToBalance: 0, refundAmount: 3000, refundMethod: "" });
  });

  it("starts a not-tracked lease (no suggestion) as a full refund too", () => {
    const v = settlementDefaults({ totalHeld: "1250.50", settlement: null, suggested: null }, "2026-11-26");
    expect(v.refundAmount).toBe(1250.5);
    expect(v.appliedToBalance).toBe(0);
    expect(v.deductions).toEqual([]);
  });

  it("edits a saved settlement with its values", () => {
    const v = settlementDefaults(
      {
        totalHeld: "3000.00",
        suggested: null,
        settlement: {
          settledOn: "2026-10-05",
          deductions: [{ id: "d1", reason: "Carpet cleaning", amount: "150.00" }],
          deductionsTotal: "150.00",
          appliedToBalance: "50.00",
          payment: { paymentId: "p1", paymentNumber: "PMT-2026-0112" },
          refundAmount: "2800.00",
          refundDate: "2026-10-06",
          refundMethod: "CHECK",
          refundReference: "Check #1043",
          notes: null,
          createdAt: "",
          updatedAt: "",
        },
      },
      "2026-11-26",
    );
    expect(v).toMatchObject({ settledOn: "2026-10-05", appliedToBalance: 50, refundAmount: 2800, refundDate: "2026-10-06", refundMethod: "CHECK", refundReference: "Check #1043", notes: "" });
    expect(v.deductions.map((d) => [d.reason, d.amount])).toEqual([["Carpet cleaning", 150]]);
  });
});

describe("left to assign", () => {
  it("is the deposit minus deductions, applied and refund, in cents", () => {
    const v = values({ deductions: [newDeduction("Cleaning", 100), newDeduction("Keys", 0.1)], appliedToBalance: 50, refundAmount: 2849.89 });
    expect(leftToAssignCents(v, "3000.00")).toBe(1);
    // Sums like 0.1 + 0.2 stay exact in cents.
    expect(leftToAssignCents(values({ deductions: [newDeduction("a", 0.1), newDeduction("b", 0.2)], refundAmount: 2999.7 }), "3000.00")).toBe(0);
  });

  it("counts empty fields as $0", () => {
    expect(leftToAssignCents(values({ deductions: [newDeduction("x", "")], appliedToBalance: "", refundAmount: "" }), "3000.00")).toBe(300000);
  });

  it("shows green at $0.00, amber when money is left, red when over", () => {
    expect(leftToAssignView(0)).toEqual({ text: "$0.00 left to assign", tone: "success" });
    expect(leftToAssignView(10000)).toEqual({ text: "$100.00 left to assign", tone: "warning" });
    expect(leftToAssignView(-2550)).toEqual({ text: "Over by $25.50", tone: "danger" });
  });
});

describe("settlementErrors / canSaveSettlement", () => {
  it("saves only when balanced and valid", () => {
    expect(canSaveSettlement(values(), ctx)).toBe(true);
    expect(canSaveSettlement(values({ refundAmount: 2900 }), ctx)).toBe(false);
    expect(canSaveSettlement(values({ refundAmount: 3100 }), ctx)).toBe(false);
  });

  it("checks deductions: reason 1-200 and an amount above $0, at most 20", () => {
    const blank = newDeduction("  ", 0);
    const long = newDeduction("x".repeat(201), 10);
    const e = settlementErrors(values({ deductions: [blank, long], refundAmount: 2990 }), ctx);
    expect(e.rows?.[blank.key]).toEqual({ reason: "Enter a reason.", amount: "Enter an amount above $0.00." });
    expect(e.rows?.[long.key]).toEqual({ reason: "At most 200 characters." });
    const many = Array.from({ length: 21 }, () => newDeduction("Fee", 1));
    expect(settlementErrors(values({ deductions: many, refundAmount: 2979 }), ctx).deductions).toBe("At most 20 deductions.");
  });

  it("caps the applied amount at maxApplicable", () => {
    expect(settlementErrors(values({ appliedToBalance: 50, refundAmount: 2950 }), ctx).appliedToBalance).toBeUndefined();
    expect(settlementErrors(values({ appliedToBalance: 50.01, refundAmount: 2949.99 }), ctx).appliedToBalance).toMatch(/^At most \$50\.00/);
  });

  it("keeps settledOn between the end and today", () => {
    expect(settlementErrors(values({ settledOn: "2026-11-27" }), ctx).settledOn).toBe("The settlement date can't be after today.");
    expect(settlementErrors(values({ settledOn: "2026-09-29" }), ctx).settledOn).toBe("The settlement date can't be before the lease ended (Sep 30, 2026).");
    expect(settlementErrors(values({ settledOn: "2026-09-30" }), ctx).settledOn).toBeUndefined();
    expect(settlementErrors(values({ settledOn: "" }), ctx).settledOn).toBe("Choose the settlement date.");
  });
});

describe("settlementBody", () => {
  it("sends numbers, trimmed text and the refund details with a refund", () => {
    const v = values({
      deductions: [newDeduction("  TEST cleaning ", 100)],
      refundAmount: 2900,
      refundDate: "2026-11-26",
      refundMethod: "CHECK",
      refundReference: " TEST ",
      notes: "  ",
    });
    expect(settlementBody(v)).toEqual({
      settledOn: "2026-11-26",
      deductions: [{ reason: "TEST cleaning", amount: 100 }],
      appliedToBalance: 0,
      refundAmount: 2900,
      refundDate: "2026-11-26",
      refundMethod: "CHECK",
      refundReference: "TEST",
      notes: null,
    });
  });

  it("leaves the refund date, method and reference out when nothing is refunded", () => {
    const body = settlementBody(values({ deductions: [newDeduction("Damage", 3000)], refundAmount: 0, refundMethod: "CHECK", refundReference: "x" }));
    expect(body).not.toHaveProperty("refundMethod");
    expect(body).not.toHaveProperty("refundDate");
    expect(body).not.toHaveProperty("refundReference");
    expect(body.refundAmount).toBe(0);
  });

  it("sends blank refund details as null with a refund", () => {
    expect(settlementBody(values())).toMatchObject({ refundDate: null, refundMethod: null, refundReference: null });
  });
});

describe("splitSettlementErrors", () => {
  it("puts field messages under their field, deduction rows by index, the rest on top", () => {
    const a = newDeduction("x", 1);
    const b = newDeduction("y", 2);
    const { errors, form } = splitSettlementErrors(
      [
        "deductions.1.amount must be greater than 0",
        "deposit.appliedToBalance must not be less than 0",
        "appliedToBalance (60.00) can't be more than what the tenant owes (50.00)",
        "deductions (225.00) + appliedToBalance (50.00) + refundAmount (2700.00) must equal the deposit held (3000.00)",
        "refundDate, refundMethod and refundReference need a refundAmount above 0",
        "settledOn must not be after today",
        "Lease LSE-2026-006 has no deposit to settle",
      ],
      [a.key, b.key],
    );
    expect(errors.rows).toEqual({ [b.key]: { amount: "Amount must be greater than 0" } });
    expect(errors.appliedToBalance).toBe("Applied to balance must not be less than 0 Applied to balance (60.00) can't be more than what the tenant owes (50.00)");
    expect(errors.settledOn).toBe("Settled on must not be after today");
    expect(form).toEqual([
      "deductions (225.00) + appliedToBalance (50.00) + refundAmount (2700.00) must equal the deposit held (3000.00)",
      "Refund date, refundMethod and refundReference need a refundAmount above 0",
      "Lease LSE-2026-006 has no deposit to settle",
    ]);
  });
});
