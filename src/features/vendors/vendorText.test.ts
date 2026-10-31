import { describe, expect, it } from "vitest";
import { insuranceText, rateText } from "@/features/vendors/vendorText";

describe("rateText", () => {
  it("shows the amount per unit", () => {
    expect(rateText({ rateAmount: "110.00", rateUnit: "HOUR" })).toBe("$110.00 / hour");
    expect(rateText({ rateAmount: "1250.50", rateUnit: "MONTH" })).toBe("$1,250.50 / month");
    expect(rateText({ rateAmount: "95.00", rateUnit: "VISIT" })).toBe("$95.00 / visit");
    expect(rateText({ rateAmount: "400.00", rateUnit: "JOB" })).toBe("$400.00 / job");
  });

  it("is null without both parts", () => {
    expect(rateText({ rateAmount: null, rateUnit: null })).toBeNull();
    expect(rateText({ rateAmount: "110.00", rateUnit: null })).toBeNull();
    expect(rateText({ rateAmount: null, rateUnit: "HOUR" })).toBeNull();
  });
});

describe("insuranceText", () => {
  const today = "2026-10-28";

  it("words each backend status", () => {
    expect(insuranceText({ insuranceStatus: "EXPIRED", insuranceExpiresOn: "2026-09-15" }, today)).toBe("Expired Sep 15");
    expect(insuranceText({ insuranceStatus: "EXPIRING", insuranceExpiresOn: "2026-11-09" }, today)).toBe("Expires Nov 9");
    expect(insuranceText({ insuranceStatus: "VALID", insuranceExpiresOn: "2027-03-31" }, today)).toBe("Valid to Mar 2027");
    expect(insuranceText({ insuranceStatus: "NONE", insuranceExpiresOn: null }, today)).toBe("No insurance on file");
  });

  it("adds the year when it isn't this year", () => {
    expect(insuranceText({ insuranceStatus: "EXPIRED", insuranceExpiresOn: "2025-12-01" }, today)).toBe("Expired Dec 1, 2025");
    expect(insuranceText({ insuranceStatus: "EXPIRING", insuranceExpiresOn: "2027-01-05" }, "2026-12-20")).toBe("Expires Jan 5, 2027");
  });

  it("trusts the backend status, never the browser's clock", () => {
    // The date is past locally, but the server (UTC) still says EXPIRING.
    expect(insuranceText({ insuranceStatus: "EXPIRING", insuranceExpiresOn: "2026-10-27" }, today)).toBe("Expires Oct 27");
  });
});
