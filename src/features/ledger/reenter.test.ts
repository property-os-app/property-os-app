import { describe, expect, it } from "vitest";
import { prefillFromEntry } from "@/features/ledger/reenter";
import type { LedgerEntry } from "@/types/ledger";

const payment: LedgerEntry = {
  id: "p1",
  kind: "PAYMENT",
  number: "PMT-2026-0112",
  type: null,
  description: null,
  date: "2026-11-26",
  amount: "50.00",
  method: "CHECK",
  referenceNumber: null,
  notes: null,
  voided: true,
  voidReason: "Typo",
  documentCount: 0,
  runningBalance: "0.00",
};

describe("prefillFromEntry", () => {
  it("re-enters a voided payment with its method", () => {
    expect(prefillFromEntry(payment)).toMatchObject({ kind: "PAYMENT", values: { amount: 50, method: "CHECK", paymentDate: "2026-11-26" } });
  });

  it("never re-enters a DEPOSIT payment (the deposit settlement replaces it)", () => {
    expect(prefillFromEntry({ ...payment, method: "DEPOSIT", voidReason: "Replaced by deposit settlement edit" })).toBeNull();
  });
});
