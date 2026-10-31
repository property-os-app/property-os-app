import { describe, expect, it } from "vitest";
import { monthsInRange, presetRange, rangeLabel, resolveRange } from "@/features/expenses/dateRange";

describe("presetRange", () => {
  const today = "2026-10-28";

  it("builds each preset from today", () => {
    expect(presetRange("ytd", today)).toEqual({ from: "2026-01-01", to: "2026-10-28" });
    expect(presetRange("this-month", today)).toEqual({ from: "2026-10-01", to: "2026-10-28" });
    expect(presetRange("last-month", today)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(presetRange("this-quarter", today)).toEqual({ from: "2026-10-01", to: "2026-10-28" });
    expect(presetRange("last-12", today)).toEqual({ from: "2025-10-29", to: "2026-10-28" });
    expect(presetRange("last-year", today)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("handles January, quarter edges and leap years", () => {
    expect(presetRange("last-month", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(presetRange("this-quarter", "2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    expect(presetRange("this-quarter", "2026-04-01")).toEqual({ from: "2026-04-01", to: "2026-04-01" });
    expect(presetRange("last-month", "2028-03-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(presetRange("last-12", "2028-02-29")).toEqual({ from: "2027-03-01", to: "2028-02-29" });
    expect(presetRange("ytd", "2026-01-01")).toEqual({ from: "2026-01-01", to: "2026-01-01" });
  });
});

describe("resolveRange", () => {
  const today = "2026-10-28";
  it("uses the custom dates, swapped when reversed, else year to date", () => {
    expect(resolveRange("custom", "2026-03-01", "2026-03-31", today)).toEqual({ from: "2026-03-01", to: "2026-03-31" });
    expect(resolveRange("custom", "2026-03-31", "2026-03-01", today)).toEqual({ from: "2026-03-01", to: "2026-03-31" });
    expect(resolveRange("custom", "", "2026-03-01", today)).toEqual({ from: "2026-01-01", to: today });
    expect(resolveRange("last-year", "2026-03-01", "2026-03-31", today)).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });
});

describe("rangeLabel and monthsInRange", () => {
  it("words the range", () => {
    expect(rangeLabel("ytd", { from: "2026-01-01", to: "2026-10-28" })).toBe("year to date");
    expect(rangeLabel("custom", { from: "2026-10-01", to: "2026-10-28" })).toBe("Oct 1 – Oct 28, 2026");
    expect(rangeLabel("custom", { from: "2025-12-15", to: "2026-01-10" })).toBe("Dec 15, 2025 – Jan 10, 2026");
  });

  it("counts calendar months with both ends", () => {
    expect(monthsInRange({ from: "2026-01-01", to: "2026-10-28" })).toBe(10);
    expect(monthsInRange({ from: "2025-10-29", to: "2026-10-28" })).toBe(13);
    expect(monthsInRange({ from: "2026-10-01", to: "2026-10-28" })).toBe(1);
  });
});
