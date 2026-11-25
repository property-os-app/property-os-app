import { describe, expect, it } from "vitest";
import { pastEndText } from "@/features/leases/stats";
import { termBadge, termParts, termView } from "@/features/leases/term";
import type { Lease } from "@/types/lease";

/** Noon UTC, so the local and UTC days are the same in almost every time zone. */
const NOW = new Date("2026-07-28T12:00:00Z");

const lease = (over: Partial<Lease>) => ({ status: "ACTIVE", isHistorical: false, startDate: "2026-01-01", endDate: "2026-12-31", ...over }) as Lease;

describe("termBadge", () => {
  it("whole months, end date included", () => {
    expect(termBadge("2026-01-01", "2026-12-31")).toBe("12-month fixed");
    expect(termBadge("2026-01-15", "2026-02-14")).toBe("1-month fixed");
    expect(termBadge("2024-02-29", "2025-02-27")).toBe("12-month fixed");
  });

  it("not whole months: months and days", () => {
    expect(termBadge("2026-10-01", "2026-11-12")).toBe("1 month, 12 days");
    expect(termBadge("2026-01-01", "2027-01-01")).toBe("12 months, 1 day");
    expect(termBadge("2026-10-01", "2026-10-10")).toBe("10 days");
  });

  it("nothing without two dates in order", () => {
    expect(termBadge(null, "2026-12-31")).toBeNull();
    expect(termBadge("2026-01-01", null)).toBeNull();
    expect(termBadge("2026-12-31", "2026-01-01")).toBeNull();
    expect(termParts("2026-01-01", "2026-01-01")).toBeNull();
  });
});

describe("termView: active", () => {
  it("the month and the days left", () => {
    const v = termView(lease({}), NOW);
    expect(v).toMatchObject({ badge: "12-month fixed", tone: "success", text: "Month 7 of 12 · 156 days left" });
    expect(v.percent).toBeCloseTo((208 / 365) * 100);
  });

  it("the first day, the day a month starts, the last days", () => {
    expect(termView(lease({ startDate: "2026-07-28", endDate: "2027-07-27" }), NOW)).toMatchObject({ text: "Month 1 of 12 · 364 days left" });
    expect(termView(lease({ startDate: "2026-07-28", endDate: "2027-07-27" }), NOW).percent).toBeCloseTo(0);
    expect(termView(lease({ startDate: "2026-06-28", endDate: "2027-06-27" }), NOW).text).toMatch(/^Month 2 of 12/);
    expect(termView(lease({ startDate: "2026-06-29", endDate: "2027-06-28" }), NOW).text).toMatch(/^Month 1 of 12/);
    expect(termView(lease({ startDate: "2025-07-30", endDate: "2026-07-29" }), NOW).text).toBe("Month 12 of 12 · 1 day left");
    expect(termView(lease({ startDate: "2025-07-29", endDate: "2026-07-28" }), NOW).text).toBe("Month 12 of 12 · ends today");
  });

  it("the total is the nearest whole month when the term isn't whole months", () => {
    expect(termView(lease({ startDate: "2025-07-29", endDate: "2026-07-29" }), NOW)).toMatchObject({ badge: "12 months, 1 day", text: "Month 12 of 12 · 1 day left" });
    expect(termView(lease({ startDate: "2025-07-28", endDate: "2026-07-28" }), NOW).text).toBe("Month 12 of 12 · ends today");
    expect(termView(lease({ startDate: "2026-06-20", endDate: "2026-08-02" }), NOW)).toMatchObject({ badge: "1 month, 14 days", text: "Month 1 of 1 · 5 days left" });
    expect(termView(lease({ startDate: "2026-06-20", endDate: "2026-08-03" }), NOW)).toMatchObject({ badge: "1 month, 15 days", text: "Month 2 of 2 · 6 days left" });
    expect(termView(lease({ startDate: "2026-07-25", endDate: "2026-08-03" }), NOW)).toMatchObject({ badge: "10 days", text: "Month 1 of 1 · 6 days left" });
  });

  it("activated before its start", () => {
    expect(termView(lease({ startDate: "2026-08-01", endDate: "2027-07-31" }), NOW)).toEqual({ badge: "12-month fixed", percent: 0, tone: "neutral", text: "Starts in 4 days" });
  });
});

describe("termView: past the end date but still active", () => {
  it("the alert's sentence, full bar, warning", () => {
    const l = lease({ startDate: "2025-07-01", endDate: "2026-06-30" });
    expect(termView(l, NOW)).toEqual({ badge: "12-month fixed", percent: 100, tone: "warning", text: "Ended 28 days ago but still active" });
    expect(pastEndText(l, NOW)).toBe("Ended 28 days ago but still active");
    expect(termView(lease({ startDate: "2025-07-28", endDate: "2026-07-27" }), NOW).text).toBe("Ended 1 day ago but still active");
  });
});

describe("termView: draft", () => {
  it("starts later, tomorrow, today", () => {
    const later = lease({ status: "DRAFT", startDate: "2026-08-07", endDate: "2027-08-06" });
    expect(termView(later, NOW)).toEqual({ badge: "12-month fixed", percent: 0, tone: "neutral", text: "Starts in 10 days" });
    expect(termView(lease({ status: "DRAFT", startDate: "2026-07-29" }), NOW).text).toBe("Starts in 1 day");
    expect(termView(lease({ status: "DRAFT", startDate: "2026-07-28" }), NOW).text).toBe("Starts today");
  });

  it("never past-end, and nothing to say without a start", () => {
    const passed = lease({ status: "DRAFT", startDate: "2025-01-01", endDate: "2025-12-31" });
    expect(termView(passed, NOW)).toMatchObject({ percent: 0, tone: "neutral", text: "Start date passed" });
    expect(termView(lease({ status: "DRAFT", startDate: null, endDate: null }), NOW)).toEqual({ badge: null, percent: 0, tone: "neutral", text: null });
    const noEnd = lease({ status: "DRAFT", startDate: "2026-08-07", endDate: null });
    expect(termView(noEnd, NOW)).toEqual({ badge: null, percent: 0, tone: "neutral", text: "Starts in 10 days" });
  });
});

describe("termView: ended and terminated", () => {
  it("ENDED: on the end date, or early when it is still ahead", () => {
    expect(termView(lease({ status: "ENDED", endDate: "2026-06-30" }), NOW)).toEqual({
      badge: "6-month fixed",
      percent: 100,
      tone: "neutral",
      text: "Ended on Jun 30, 2026",
    });
    expect(termView(lease({ status: "ENDED", endDate: "2026-07-28" }), NOW).text).toBe("Ended on Jul 28, 2026");
    expect(termView(lease({ status: "ENDED" }), NOW).text).toBe("Ended early · end date is Dec 31, 2026");
  });

  it("TERMINATED never claims the end date as the day it ended", () => {
    expect(termView(lease({ status: "TERMINATED" }), NOW)).toMatchObject({ percent: 100, tone: "neutral", text: "Terminated · end date is Dec 31, 2026" });
    expect(termView(lease({ status: "TERMINATED", endDate: "2026-06-30" }), NOW).text).toBe("Terminated · end date was Jun 30, 2026");
  });
});

describe("termView: old (history-only) lease", () => {
  it("dates only: no badge, bar or text", () => {
    const old = lease({ status: "ENDED", isHistorical: true, startDate: "2019-01-01", endDate: "2019-12-31" });
    expect(termView(old, NOW)).toEqual({ badge: null, percent: null, tone: "neutral", text: null });
  });
});
