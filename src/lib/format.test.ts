import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addDaysISO,
  addMonthsISO,
  addMonthsYM,
  centsToAmount,
  currentMonth,
  currentMonthUTC,
  dayInMonth,
  daysSince,
  daysUntil,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatMonth,
  formatPercent,
  formatShortDate,
  formatTimestampDate,
  isMonth,
  leaseCountdown,
  ordinal,
  parseDateOnly,
  todayISO,
  todayUTC,
  toCents,
} from "@/lib/format";

/** Runs the tests of a describe block in a time zone (undone after each test by `unstubEnvs` in vitest.config.ts). */
const inZone = (tz: string) => beforeEach(() => vi.stubEnv("TZ", tz));

/** Fake "now" for the block. */
const at = (iso: string) => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  });
  afterEach(() => vi.useRealTimers());
};

describe("time zone setup", () => {
  it("runs in UTC by default", () => {
    expect(new Date("2026-01-15T12:00:00Z").getTimezoneOffset()).toBe(0);
  });

  describe("America/New_York", () => {
    inZone("America/New_York");
    it("switches the zone (EST is UTC-5 in January, EDT UTC-4 in July)", () => {
      expect(new Date("2026-01-15T12:00:00Z").getTimezoneOffset()).toBe(300);
      expect(new Date("2026-07-15T12:00:00Z").getTimezoneOffset()).toBe(240);
    });
  });
});

describe("toCents", () => {
  it.each([
    ["1200.00", 120000],
    ["2500", 250000],
    ["2500.5", 250050],
    ["-150.00", -15000],
    [".5", 50],
    ["0.01", 1],
    ["1,200.00", 120000],
    ["  42.10 ", 4210],
    ["+7.25", 725],
    ["-0.00", 0],
    ["1.005", 101],
    ["1.004", 100],
    ["-1.005", -101],
  ])("%s -> %d", (input, cents) => {
    expect(toCents(input)).toBe(cents);
  });

  it("gives 0 for null, undefined and empty text", () => {
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
    expect(toCents("")).toBe(0);
    expect(toCents("   ")).toBe(0);
  });

  it("gives NaN for text that isn't money", () => {
    for (const bad of ["abc", "-", ".", "1.2.3", "12a", "$5"]) expect(toCents(bad)).toBeNaN();
  });

  it("accepts numbers from older callers", () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents(-3)).toBe(-300);
    expect(toCents(Number.NaN)).toBeNaN();
  });

  it("sums without float drift (0.10 + 0.20)", () => {
    expect(toCents("0.10") + toCents("0.20")).toBe(toCents("0.30"));
  });
});

describe("centsToAmount", () => {
  it.each([
    [250050, 2500.5],
    [120000, 1200],
    [1, 0.01],
    [-15000, -150],
    [-5, -0.05],
    [0, 0],
  ])("%d -> %d", (cents, amount) => {
    expect(centsToAmount(cents)).toBe(amount);
  });

  it("round-trips with toCents", () => {
    for (const s of ["0.01", "19.99", "1234567.89", "-150.00"]) expect(toCents(centsToAmount(toCents(s)))).toBe(toCents(s));
  });
});

describe("formatCurrency", () => {
  it.each([
    ["1200.00", "$1,200.00"],
    ["-150.00", "-$150.00"],
    ["2500.5", "$2,500.50"],
    ["0.00", "$0.00"],
    ["-0.00", "$0.00"],
    ["1234567.89", "$1,234,567.89"],
    [1450, "$1,450.00"],
  ])("%s -> %s", (input, out) => {
    expect(formatCurrency(input)).toBe(out);
  });

  it("shows a dash for empty or invalid values", () => {
    for (const v of [null, undefined, "", "  ", "abc"]) expect(formatCurrency(v)).toBe("-");
  });
});

describe("formatCompactCurrency", () => {
  it.each([
    ["128400.00", "$128.4K"],
    ["24600000.00", "$24.6M"],
    ["999.00", "$999"],
    ["1000.00", "$1.0K"],
    ["-2500.00", "-$2.5K"],
    ["12.40", "$12"],
  ])("%s -> %s", (input, out) => {
    expect(formatCompactCurrency(input)).toBe(out);
  });

  it("moves to the next unit when rounding reaches it", () => {
    expect(formatCompactCurrency("999.50")).toBe("$1.0K");
    expect(formatCompactCurrency("999950.00")).toBe("$1.0M");
    expect(formatCompactCurrency("999999.99")).toBe("$1.0M");
    expect(formatCompactCurrency("-999999.99")).toBe("-$1.0M");
    expect(formatCompactCurrency("999949.99")).toBe("$999.9K");
  });

  it("drops the minus when the value rounds to $0", () => {
    expect(formatCompactCurrency("-0.40")).toBe("$0");
    expect(formatCompactCurrency("-0.01")).toBe("$0");
    expect(formatCompactCurrency("0.00")).toBe("$0");
    expect(formatCompactCurrency("-0.50")).toBe("-$1");
  });

  it("shows a dash for empty or invalid values", () => {
    expect(formatCompactCurrency(null)).toBe("-");
    expect(formatCompactCurrency("x")).toBe("-");
  });
});

describe("formatPercent", () => {
  it("formats numbers and numeric strings", () => {
    expect(formatPercent(94.25)).toBe("94.3%");
    expect(formatPercent("94.2")).toBe("94.2%");
    expect(formatPercent(50, 0)).toBe("50%");
  });
  it("shows a dash for empty or invalid values", () => {
    for (const v of [null, undefined, "", "abc"]) expect(formatPercent(v)).toBe("-");
  });
});

describe("parseDateOnly", () => {
  it("parses a real calendar day", () => {
    expect(parseDateOnly("2026-11-01")).toEqual({ y: 2026, m: 11, d: 1 });
    expect(parseDateOnly("2028-02-29")).toEqual({ y: 2028, m: 2, d: 29 });
  });

  it("rejects days that don't exist", () => {
    for (const bad of ["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00"]) expect(parseDateOnly(bad)).toBeNull();
  });

  it("rejects anything that isn't exactly YYYY-MM-DD", () => {
    for (const bad of ["2026-10-24T00:00:00Z", "2026-1-5", "10/24/2026", " 2026-10-24", "", null, undefined, 20261024, new Date()]) {
      expect(parseDateOnly(bad)).toBeNull();
    }
  });
});

describe("date-only formatting", () => {
  for (const tz of ["UTC", "America/New_York", "America/Los_Angeles"]) {
    describe(tz, () => {
      inZone(tz);
      it("formatDate keeps the same day (never the day before)", () => {
        expect(formatDate("2026-11-01")).toBe("Nov 1, 2026");
        expect(formatDate("2027-01-01")).toBe("Jan 1, 2027");
      });
      it("formatShortDate keeps the same day", () => {
        expect(formatShortDate("2026-10-14")).toBe("Oct 14");
      });
    });
  }

  it("formatDate: dash for empty, invalid and timestamps", () => {
    for (const v of [null, undefined, "", "2026-02-30", "2026-10-24T10:00:00Z"]) expect(formatDate(v)).toBe("-");
  });

  it("formatDate takes a Date as its local day", () => {
    expect(formatDate(new Date(2026, 9, 24, 23, 30))).toBe("Oct 24, 2026");
  });

  it("formatShortDate: dash for invalid", () => {
    expect(formatShortDate("nope")).toBe("-");
    expect(formatShortDate(null)).toBe("-");
  });
});

describe("formatTimestampDate", () => {
  const evening = "2026-10-25T02:00:00Z"; // 10 pm on Oct 24 in New York (EDT)

  it("UTC: the UTC day", () => {
    expect(formatTimestampDate(evening)).toBe("Oct 25, 2026");
  });

  describe("America/New_York", () => {
    inZone("America/New_York");
    it("the local day, not the UTC day", () => {
      expect(formatTimestampDate(evening)).toBe("Oct 24, 2026");
    });
  });

  it("dash for empty or invalid", () => {
    expect(formatTimestampDate(null)).toBe("-");
    expect(formatTimestampDate("")).toBe("-");
    expect(formatTimestampDate("not a date")).toBe("-");
  });
});

describe("today", () => {
  describe("UTC at 2026-10-25 02:00Z", () => {
    at("2026-10-25T02:00:00Z");
    it("local and UTC are the same day", () => {
      expect(todayISO()).toBe("2026-10-25");
      expect(todayUTC()).toBe("2026-10-25");
      expect(currentMonth()).toBe("2026-10");
      expect(currentMonthUTC()).toBe("2026-10");
    });
  });

  describe("America/New_York at 2026-10-25 02:00Z (Oct 24, 10 pm local)", () => {
    inZone("America/New_York");
    at("2026-10-25T02:00:00Z");
    it("todayISO is the local day, todayUTC the backend's day", () => {
      expect(todayISO()).toBe("2026-10-24");
      expect(todayUTC()).toBe("2026-10-25");
    });
  });

  describe("America/New_York at 2026-11-01 03:00Z (Oct 31, 11 pm local)", () => {
    inZone("America/New_York");
    at("2026-11-01T03:00:00Z");
    it("the local month is still October while the UTC month is November", () => {
      expect(currentMonth()).toBe("2026-10");
      expect(currentMonthUTC()).toBe("2026-11");
    });
  });
});

describe("daysUntil / daysSince", () => {
  describe("UTC, today 2026-10-24", () => {
    at("2026-10-24T12:00:00Z");
    it("daysUntil counts calendar days", () => {
      expect(daysUntil("2026-10-24")).toBe(0);
      expect(daysUntil("2026-10-25")).toBe(1);
      expect(daysUntil("2026-10-14")).toBe(-10);
      expect(daysUntil("2027-10-24")).toBe(365);
    });
    it("daysUntil: null for empty or invalid", () => {
      expect(daysUntil(null)).toBeNull();
      expect(daysUntil("")).toBeNull();
      expect(daysUntil("2026-02-30")).toBeNull();
    });
    it("daysSince is at least 1", () => {
      expect(daysSince("2026-10-14")).toBe(10);
      expect(daysSince("2026-10-23")).toBe(1);
      expect(daysSince("2026-10-24")).toBe(1);
      expect(daysSince("2026-11-01")).toBe(1);
      expect(daysSince(null)).toBe(1);
      expect(daysSince("bad")).toBe(1);
    });
  });

  describe("America/New_York, Oct 24 10 pm local (Oct 25 UTC)", () => {
    inZone("America/New_York");
    at("2026-10-25T02:00:00Z");
    it("counts from the local day", () => {
      expect(daysUntil("2026-10-24")).toBe(0);
      expect(daysSince("2026-10-14")).toBe(10);
    });
  });

  describe("America/New_York across the DST change (Nov 1, 2026)", () => {
    inZone("America/New_York");
    at("2026-11-10T17:00:00Z");
    it("still whole days", () => {
      expect(daysSince("2026-10-31")).toBe(10);
      expect(daysUntil("2027-03-15")).toBe(125);
    });
  });

  it("takes an explicit now", () => {
    expect(daysUntil("2026-12-25", new Date(2026, 11, 20))).toBe(5);
  });
});

describe("leaseCountdown", () => {
  const now = new Date(2026, 9, 24);
  it("tones by days left", () => {
    expect(leaseCountdown("2026-11-10", now)).toEqual({ label: "Expires in 17 days", tone: "danger" });
    expect(leaseCountdown("2026-12-10", now)).toEqual({ label: "Expires in 47 days", tone: "warning" });
    expect(leaseCountdown("2027-06-30", now)).toEqual({ label: "Jun 30, 2027", tone: "neutral" });
    expect(leaseCountdown("2026-10-19", now)).toEqual({ label: "Expired 5 days ago", tone: "danger" });
  });
  it("dash for invalid", () => {
    expect(leaseCountdown("nope", now)).toEqual({ label: "-", tone: "neutral" });
  });
});

describe("addMonthsISO / addDaysISO", () => {
  it("adds months and clamps the day", () => {
    expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsISO("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsISO("2026-11-15", 2)).toBe("2027-01-15");
    expect(addMonthsISO("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsISO("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonthsISO("bad", 1)).toBeNull();
  });
  it("adds days across months and years", () => {
    expect(addDaysISO("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysISO("2026-10-24", 0)).toBe("2026-10-24");
    expect(addDaysISO("2026-02-30", 1)).toBeNull();
  });
  describe("America/New_York", () => {
    inZone("America/New_York");
    it("gives the same results (no time zone math)", () => {
      expect(addDaysISO("2026-11-01", 1)).toBe("2026-11-02");
      expect(addMonthsISO("2026-10-31", 1)).toBe("2026-11-30");
    });
  });
});

describe("months", () => {
  it("isMonth", () => {
    expect(isMonth("2026-10")).toBe(true);
    for (const bad of ["2026-13", "2026-00", "2026-1", "2026-10-01", "", null, undefined]) expect(isMonth(bad)).toBe(false);
  });
  it("formatMonth", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2026-13")).toBe("-");
  });
  it("addMonthsYM", () => {
    expect(addMonthsYM("2026-12", 1)).toBe("2027-01");
    expect(addMonthsYM("2026-01", -1)).toBe("2025-12");
    expect(addMonthsYM("2026-10", 14)).toBe("2027-12");
    expect(addMonthsYM("bad", 1)).toBe("bad");
  });
  it("dayInMonth clamps to the last day", () => {
    expect(dayInMonth("2026-02", 31)).toBe("2026-02-28");
    expect(dayInMonth("2028-02", 31)).toBe("2028-02-29");
    expect(dayInMonth("2026-10", 1)).toBe("2026-10-01");
    expect(dayInMonth("2026-10", 0)).toBeNull();
    expect(dayInMonth("2026-10", 1.5)).toBeNull();
    expect(dayInMonth("bad", 1)).toBeNull();
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [31, "31st"],
  ])("%d -> %s", (n, out) => {
    expect(ordinal(n)).toBe(out);
  });
});
