import { describe, expect, it } from "vitest";
import { labelOptions, paymentMethodLabel, paymentMethodLabels, readableValue, referenceHint, unitLabel } from "@/lib/labels";
import type { PaymentMethod } from "@/types/ledger";

/** API.md section 2, `PaymentMethod`: the values in the order to show them. */
const API_PAYMENT_METHODS: PaymentMethod[] = ["ACH", "CHECK", "CREDIT_CARD", "CASH", "VENMO", "ZELLE", "OTHER"];

describe("payment methods", () => {
  it("are the API's list in its order, Other last", () => {
    expect(Object.keys(paymentMethodLabels)).toEqual(API_PAYMENT_METHODS);
    expect(labelOptions(paymentMethodLabels).map((o) => o.label)).toEqual(["ACH bank transfer", "Check", "Credit card", "Cash", "Venmo", "Zelle", "Other"]);
  });

  it("show their label, and a readable fallback for an unknown value", () => {
    for (const m of API_PAYMENT_METHODS) expect(paymentMethodLabel(m)).toBe(paymentMethodLabels[m]);
    expect(paymentMethodLabel("APPLE_PAY")).toBe("Apple pay");
    expect(paymentMethodLabel("WIRE")).toBe("Wire");
    expect(paymentMethodLabel("toString")).toBe("Tostring");
    expect(readableValue("  MONEY__ORDER ")).toBe("Money order");
  });

  it("hint a transaction ID for Venmo and Zelle only", () => {
    for (const m of API_PAYMENT_METHODS) expect(referenceHint(m)).toBe(m === "VENMO" || m === "ZELLE" ? "Transaction ID (optional)" : undefined);
    expect(referenceHint("")).toBeUndefined();
    expect(referenceHint(null)).toBeUndefined();
  });
});

describe("unitLabel", () => {
  it('adds "Unit " only when the number starts with a digit', () => {
    expect(unitLabel("2")).toBe("Unit 2");
    expect(unitLabel("4B")).toBe("Unit 4B");
    expect(unitLabel(" 101 ")).toBe("Unit 101");
  });

  it("shows other names as entered, so nothing reads \"Unit Unit 1\"", () => {
    expect(unitLabel("Unit 1")).toBe("Unit 1");
    expect(unitLabel("UNIT 1")).toBe("UNIT 1");
    expect(unitLabel("House")).toBe("House");
    expect(unitLabel("Office")).toBe("Office");
    expect(unitLabel("Single Fam")).toBe("Single Fam");
  });
});
