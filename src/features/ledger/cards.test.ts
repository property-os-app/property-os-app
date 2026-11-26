import { describe, expect, it } from "vitest";
import { allocationParts, allocationText, balanceOrCreditText, cardLabel, creditAmount, groupCardsByMonth } from "@/features/ledger/cards";
import type { LedgerCard, LedgerPaymentAllocation } from "@/types/ledger";

const card = (over: Partial<LedgerCard>): LedgerCard => ({
  chargeId: "c",
  invoiceNumber: "INV-1",
  type: "RENT",
  description: "Monthly Rent",
  month: "2026-10",
  dueDate: "2026-10-01",
  amount: "600.00",
  paid: "0.00",
  remaining: "600.00",
  status: "UNPAID",
  voidReason: null,
  payments: [],
  ...over,
});

const alloc = (over: Partial<LedgerPaymentAllocation>): LedgerPaymentAllocation => ({
  paymentId: "p",
  paymentNumber: "PMT-1",
  date: "2026-11-03",
  method: "CHECK",
  amount: "1200.00",
  voided: false,
  applied: [],
  unapplied: "0.00",
  ...over,
});

describe("groupCardsByMonth", () => {
  it("newest month first, API order inside a month, totals without voided cards", () => {
    const cards = [
      card({ chargeId: "r9", month: "2026-09", amount: "600.00", paid: "600.00", remaining: "0.00", status: "PAID" }),
      card({ chargeId: "r10", month: "2026-10", amount: "600.00", paid: "200.00", remaining: "400.00", status: "PARTIAL" }),
      card({ chargeId: "f10", type: "LATE_FEE", month: "2026-10", dueDate: "2026-10-06", amount: "50.00", paid: "0.00", remaining: "50.00", status: "OVERDUE" }),
      card({ chargeId: "v10", type: "OTHER", month: "2026-10", amount: "0.00", paid: "0.00", remaining: "0.00", status: "VOID", voidReason: "Typo" }),
    ];
    const months = groupCardsByMonth(cards);
    expect(months.map((m) => m.month)).toEqual(["2026-10", "2026-09"]);
    expect(months[0]!.cards.map((c) => c.chargeId)).toEqual(["r10", "f10", "v10"]);
    expect(months[0]).toMatchObject({ charged: "650.00", paid: "200.00", remaining: "450.00" });
    expect(months[1]).toMatchObject({ charged: "600.00", paid: "600.00", remaining: "0.00" });
  });

  it("no cards", () => {
    expect(groupCardsByMonth([])).toEqual([]);
  });
});

describe("cardLabel", () => {
  it("month and type, the year only when it differs, OTHER by description", () => {
    expect(cardLabel(card({}), "2026")).toBe("Oct rent");
    expect(cardLabel(card({ type: "LATE_FEE" }), "2026")).toBe("Oct late fee");
    expect(cardLabel(card({ month: "2025-12" }), "2026")).toBe("Dec 2025 rent");
    expect(cardLabel(card({ type: "OTHER", description: "Key replacement" }), "2026")).toBe("Key replacement");
  });
});

describe("allocationText", () => {
  const cards = [card({ chargeId: "r10" }), card({ chargeId: "r11", month: "2026-11" })];

  it("lists the charges paid and the credit left", () => {
    const a = alloc({
      applied: [
        { chargeId: "r10", invoiceNumber: "INV-10", amount: "600.00" },
        { chargeId: "r11", invoiceNumber: "INV-11", amount: "550.00" },
      ],
      unapplied: "50.00",
    });
    expect(allocationText(a, cards)).toBe("Paid: Oct rent $600.00, Nov rent $550.00 + $50.00 credit");
    expect(allocationParts(a, cards).map((p) => p.chargeId)).toEqual(["r10", "r11", null]);
  });

  it("an unknown charge falls back to its invoice number", () => {
    expect(allocationText(alloc({ applied: [{ chargeId: "x", invoiceNumber: "INV-9", amount: "10.00" }] }), cards)).toBe("Paid: INV-9 $10.00");
  });

  it("voided, all credit, and nothing", () => {
    expect(allocationText(alloc({ voided: true }), cards)).toBe("Voided: paid nothing");
    expect(allocationText(alloc({ unapplied: "1200.00" }), cards)).toBe("Paid ahead: $1,200.00 credit");
    expect(allocationText(alloc({ amount: "0.00" }), cards)).toBe("Paid: nothing yet");
  });
});

describe("credit", () => {
  it("from summary.credit only", () => {
    expect(creditAmount({ credit: "50.00" })).toBe("50.00");
    expect(creditAmount({ credit: "0.00" })).toBeNull();
    expect(creditAmount(undefined)).toBeNull();
    expect(balanceOrCreditText({ balance: "-50.00", credit: "50.00" })).toBe("Credit $50.00");
    expect(balanceOrCreditText({ balance: "1200.00", credit: "0.00" })).toBe("$1,200.00");
  });
});
