import { describe, expect, it } from "vitest";
import { balanceText } from "@/features/ledger/balance";

describe("balanceText", () => {
  it("owed balance as money", () => {
    expect(balanceText("1200.00")).toBe("$1,200.00");
    expect(balanceText("0.01")).toBe("$0.01");
  });

  it("zero", () => {
    expect(balanceText("0.00")).toBe("$0.00");
  });

  it("negative balance as a credit", () => {
    expect(balanceText("-150.00")).toBe("Credit $150.00");
    expect(balanceText("-1234.56")).toBe("Credit $1,234.56");
  });

  it("empty shows a dash", () => {
    expect(balanceText(null)).toBe("-");
  });
});
