import { describe, expect, it } from "vitest";
import { billOnDate, LEAD_DAY_OPTIONS, leadDaysExample } from "@/features/settings/billing";

describe("billOnDate", () => {
  it("the due date minus the lead days, across months and years", () => {
    expect(billOnDate("2026-11-01", 14)).toBe("2026-10-18");
    expect(billOnDate("2026-11-05", 14)).toBe("2026-10-22");
    expect(billOnDate("2026-11-20", 14)).toBe("2026-11-06");
    expect(billOnDate("2027-01-01", 1)).toBe("2026-12-31");
    expect(billOnDate("2027-03-01", 28)).toBe("2027-02-01");
  });
});

describe("leadDaysExample", () => {
  it("uses the 1st of next month (UTC)", () => {
    expect(leadDaysExample(14, "2026-10-24")).toBe("Due Nov 1 → billed Oct 18");
    expect(leadDaysExample(1, "2026-10-24")).toBe("Due Nov 1 → billed Oct 31");
    expect(leadDaysExample(28, "2026-10-24")).toBe("Due Nov 1 → billed Oct 4");
  });

  it("rolls into the next year", () => {
    expect(leadDaysExample(14, "2026-12-15")).toBe("Due Jan 1 → billed Dec 18");
  });
});

it("offers 1 to 28 days", () => {
  expect(LEAD_DAY_OPTIONS[0]).toBe(1);
  expect(LEAD_DAY_OPTIONS.at(-1)).toBe(28);
  expect(LEAD_DAY_OPTIONS).toHaveLength(28);
});
