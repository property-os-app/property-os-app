import { describe, expect, it } from "vitest";
import { applicableCap, centsText, chargesTotal, depositBadge, endBody, endMaxApplicable, endToast, leaseDepositTotal, previewRows, settledOnMin } from "@/features/deposits/endPreview";
import type { EndPreview, EndPreviewCharge, VoidedCharge } from "@/types/deposit";

function charge(month: string, amount: string, paid = "0.00"): EndPreviewCharge {
  return { chargeId: `c-${month}`, invoiceNumber: `INV-${month}`, type: "RENT", description: `Monthly Rent - ${month}`, month, dueDate: `${month}-01`, amount, paid, status: "OVERDUE" };
}

const preview: Pick<EndPreview, "balanceNow" | "balanceAfterVoid" | "deposit"> = {
  balanceNow: "8600.00",
  balanceAfterVoid: "50.00",
  deposit: { securityDeposit: "2700.00", petDeposit: "300.00", totalHeld: "3000.00", status: "HELD" },
};

const voided = (id: string): VoidedCharge => ({ chargeId: id, invoiceNumber: "", month: "", dueDate: "", amount: "" });

describe("previewRows", () => {
  it("lists month, invoice, amount, and what a paid charge turns into", () => {
    const rows = previewRows([charge("2026-10", "2850.00", "2850.00"), charge("2026-11", "2850.00", "100.50"), charge("2026-12", "2850.00")]);
    expect(rows.map((r) => [r.month, r.invoiceNumber, r.amount, r.paidNote])).toEqual([
      ["October 2026", "INV-2026-10", "$2,850.00", "paid $2,850.00 → becomes credit"],
      ["November 2026", "INV-2026-11", "$2,850.00", "paid $100.50 → becomes credit"],
      ["December 2026", "INV-2026-12", "$2,850.00", null],
    ]);
  });

  it("adds the list up in cents", () => {
    expect(chargesTotal([charge("2026-10", "0.10"), charge("2026-11", "0.20")])).toBe("0.30");
    expect(chargesTotal([])).toBe("0.00");
  });
});

describe("the deposit cap inside End lease", () => {
  it("uses the balance after the voids when they are ticked, else the balance now, capped at the deposit", () => {
    expect(endMaxApplicable(preview, true)).toBe("50.00");
    expect(endMaxApplicable(preview, false)).toBe("3000.00");
  });

  it("is $0 when the tenant has a credit", () => {
    expect(applicableCap("3000.00", "-2850.00")).toBe("0.00");
    expect(centsText(-5)).toBe("-0.05");
  });
});

describe("endBody", () => {
  it("sends status, the end date, the voids and the settlement", () => {
    const deposit = { deductions: [], appliedToBalance: 0, refundAmount: 3000 };
    expect(endBody({ cancels: false, status: "TERMINATED", endedOn: "2026-09-30", voidCharges: true, deposit })).toEqual({
      status: "TERMINATED",
      endedOn: "2026-09-30",
      voidChargesAfterEnd: true,
      deposit,
    });
  });

  it("leaves out what wasn't chosen, and the date of a cancel", () => {
    expect(endBody({ cancels: false, status: "ENDED", endedOn: "2026-09-30", voidCharges: false, deposit: null })).toEqual({ status: "ENDED", endedOn: "2026-09-30" });
    expect(endBody({ cancels: true, status: "TERMINATED", endedOn: "2026-09-30", voidCharges: true, deposit: null })).toEqual({ status: "ENDED", voidChargesAfterEnd: true });
  });
});

describe("endToast", () => {
  const base = { leaseNumber: "LSE-2026-006", status: "ENDED" as const, cancelledOn: null };
  it("names only what happened", () => {
    expect(endToast({ ...base, voidedCharges: [voided("a"), voided("b")], depositSettlement: {} as never })).toBe("Lease LSE-2026-006 ended · 2 charges voided · deposit settled");
    expect(endToast({ ...base, voidedCharges: [voided("a")] })).toBe("Lease LSE-2026-006 ended · 1 charge voided");
    expect(endToast({ ...base, voidedCharges: [] })).toBe("Lease LSE-2026-006 ended");
    expect(endToast({ ...base, status: "TERMINATED" })).toBe("Lease LSE-2026-006 terminated");
    expect(endToast({ ...base, cancelledOn: "2026-11-26" })).toBe("Lease LSE-2026-006 cancelled");
  });
});

describe("deposit helpers", () => {
  it("settles from the end, else the cancel, else the start", () => {
    expect(settledOnMin({ endedOn: "2026-09-30", cancelledOn: null, startDate: "2026-01-01" })).toBe("2026-09-30");
    expect(settledOnMin({ endedOn: null, cancelledOn: "2026-11-20", startDate: "2027-01-01" })).toBe("2026-11-20");
    expect(settledOnMin({ endedOn: null, cancelledOn: null, startDate: "2020-01-01" })).toBe("2020-01-01");
  });

  it("adds security and pet deposits", () => {
    expect(leaseDepositTotal({ deposit: "2700.00", petDeposit: "300.00" })).toBe("3000.00");
    expect(leaseDepositTotal({ deposit: "1250", petDeposit: null })).toBe("1250.00");
    expect(leaseDepositTotal({ deposit: null, petDeposit: null })).toBe("0.00");
  });

  it("shows Not tracked for an ended lease with a deposit and no status", () => {
    expect(depositBadge("HELD", "3000.00", "ACTIVE")).toBe("HELD");
    expect(depositBadge(null, "3000.00", "ENDED")).toBe("NOT_TRACKED");
    expect(depositBadge(null, "0.00", "ENDED")).toBeNull();
    expect(depositBadge(null, "3000.00", "DRAFT")).toBeNull();
  });
});
