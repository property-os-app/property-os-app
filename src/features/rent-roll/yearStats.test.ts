import { describe, expect, it } from "vitest";
import {
  CELL_STATUSES,
  cellDescription,
  cellDisplay,
  cellStatusLabels,
  cellTone,
  chipsFromParam,
  daysToEndText,
  filterYearRows,
  groupByProperty,
  hasUnpaidMonths,
  hasVacancy,
  isLeaseEnded,
  isReservedRow,
  matchesChips,
  renewalText,
  rowTitle,
  shortMonthYear,
  shownVacantMonths,
  viewSwitchParams,
  yearLeasePath,
  yearFromParam,
  yearRowKey,
} from "@/features/rent-roll/yearStats";
import type { RentRollYearCell, RentRollYearCellStatus, RentRollYearResponse, RentRollYearRow, RentRollYearTotals } from "@/types/rentRoll";

/* ---------- Hand-written fixtures in the API sample's shape ---------- */

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

function cell(month: string, status: RentRollYearCellStatus, paid = "0.00", charged = "0.00", balance = "0.00"): RentRollYearCell {
  return { month, status, paid, charged, balance };
}

function makeRow(over: Partial<RentRollYearRow> = {}): RentRollYearRow {
  return {
    kind: "LEASE",
    unit: { id: "u1", unitNumber: "1", status: "OCCUPIED", monthlyRent: "2900.00", property: { id: "p1", name: "Fieldstone" } },
    lease: {
      id: "l1",
      leaseNumber: "LSE-2026-001",
      status: "ACTIVE",
      signatureStatus: "SIGNED",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      rent: "2850.00",
      deposit: "2850.00",
      tenants: [
        { id: "t1", fullName: "Ana Reyes", isPrimary: true },
        { id: "t2", fullName: "Ben Cole", isPrimary: false },
      ],
    },
    months: MONTHS.map((m) => cell(m, "PAID", "2850.00", "2850.00")),
    totalCharged: "34200.00",
    totalPaid: "34200.00",
    lateFees: "0.00",
    vacantMonths: [],
    daysToLeaseEnd: 42,
    renewalAlert: "ENDS_SOON",
    nextLease: null,
    ...over,
  };
}

const vacantRow = (over: Partial<RentRollYearRow> = {}) =>
  makeRow({
    kind: "VACANT_UNIT",
    lease: null,
    unit: { id: "u2", unitNumber: "2", status: "VACANT", monthlyRent: "2700.00", property: { id: "p1", name: "Fieldstone" } },
    months: MONTHS.map((m) => cell(m, m <= "2026-11" ? "VACANT" : "FUTURE")),
    totalCharged: "0.00",
    totalPaid: "0.00",
    vacantMonths: MONTHS.slice(0, 11),
    daysToLeaseEnd: null,
    renewalAlert: null,
    ...over,
  });

function totals(paid = "0.00"): RentRollYearTotals {
  return { months: MONTHS.map((m) => ({ month: m, charged: paid, paid })), totalCharged: paid, totalPaid: paid, lateFees: "0.00" };
}

/* ---------- Year ---------- */

describe("yearFromParam", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("accepts 2000 to next UTC year", () => {
    expect(yearFromParam("2000", now)).toBe(2000);
    expect(yearFromParam("2027", now)).toBe(2027);
  });
  it("falls back to the current UTC year", () => {
    expect(yearFromParam(null, now)).toBe(2026);
    expect(yearFromParam("1999", now)).toBe(2026);
    expect(yearFromParam("2028", now)).toBe(2026);
    expect(yearFromParam("26", now)).toBe(2026);
    expect(yearFromParam("2026x", now)).toBe(2026);
  });
  it("uses the UTC year on New Year's Eve in New York", () => {
    expect(yearFromParam(null, new Date("2027-01-01T02:00:00Z"))).toBe(2027);
  });
});

describe("viewSwitchParams", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("month -> year keeps the search and drops month filters", () => {
    const out = viewSwitchParams(new URLSearchParams("month=2025-03&status=PAID&page=2&sort=tenant:asc&q=ana"), "year", "2025-03", now);
    expect(out.toString()).toBe("q=ana&view=year&year=2025");
  });
  it("year -> month: the current month this year, else January", () => {
    expect(viewSwitchParams(new URLSearchParams("view=year&year=2026&chips=vacant"), "month", "2026", now).toString()).toBe("month=2026-11");
    expect(viewSwitchParams(new URLSearchParams("view=year&year=2024&q=x"), "month", "2024", now).toString()).toBe("q=x&month=2024-01");
  });
});

/* ---------- Cells ---------- */

describe("cell status → tone and label", () => {
  it("covers every status with theme classes only", () => {
    for (const s of CELL_STATUSES) {
      expect(cellStatusLabels[s]).toBeTruthy();
      expect(cellTone[s].cell).not.toMatch(/#|white|black|gray|slate|zinc|red-|green-|amber-/);
    }
    expect(cellTone.PAID.cell).toContain("bg-success-soft");
    expect(cellTone.PARTIAL.cell).toContain("bg-warning-soft");
    expect(cellTone.UNPAID.cell).toContain("bg-danger-soft");
    expect(cellTone.OVERDUE.cell).toContain("text-danger");
    expect(cellTone.VACANT.cell).toContain("text-text-muted");
    expect(cellStatusLabels.NOT_BILLED).toBe("Not billed");
  });
});

describe("cellDisplay", () => {
  it("shows the paid amount on money statuses, even $0.00", () => {
    expect(cellDisplay(cell("2026-10", "PARTIAL", "1000.00", "2850.00", "1850.00"))).toBe("$1,000.00");
    expect(cellDisplay(cell("2026-10", "UNPAID", "0.00", "2850.00", "2850.00"))).toBe("$0.00");
  });
  it("shows Vacant, and a dash for outside-lease and unpaid future months", () => {
    expect(cellDisplay(cell("2026-05", "VACANT"))).toBe("Vacant");
    expect(cellDisplay(cell("2026-12", "OUTSIDE_LEASE"))).toBeNull();
    expect(cellDisplay(cell("2026-12", "FUTURE"))).toBeNull();
    expect(cellDisplay(cell("2026-12", "FUTURE", "500.00"))).toBe("$500.00");
  });
});

describe("cellDescription", () => {
  it("reads like the design's tooltip", () => {
    expect(cellDescription(cell("2026-10", "PAID", "2850.00", "2850.00"))).toBe("Oct 2026 · Paid $2,850.00 of $2,850.00 · Paid");
    expect(cellDescription(cell("2026-10", "PARTIAL", "1000.00", "2850.00", "1850.00"))).toBe(
      "Oct 2026 · Paid $1,000.00 of $2,850.00 · Balance $1,850.00 · Partial",
    );
  });
  it("names vacant, outside-lease and not-billed months", () => {
    expect(cellDescription(cell("2026-05", "VACANT"))).toBe("May 2026 · Unit vacant");
    expect(cellDescription(cell("2026-12", "OUTSIDE_LEASE"))).toBe("Dec 2026 · Outside this lease");
    expect(cellDescription(cell("2026-12", "FUTURE"))).toBe("Dec 2026 · Not billed yet");
    expect(cellDescription(cell("2026-11", "NOT_BILLED", "100.00"))).toBe("Nov 2026 · Not billed · Paid $100.00");
  });
  it("says an overdue balance can include earlier months", () => {
    expect(cellDescription(cell("2026-10", "OVERDUE", "0.00", "2850.00", "5700.00"))).toBe(
      "Oct 2026 · Paid $0.00 of $2,850.00 · Balance $5,700.00 · Overdue · balance includes earlier months",
    );
  });
  it("formats the month without Date math", () => {
    expect(shortMonthYear("2026-01")).toBe("Jan 2026");
    expect(shortMonthYear("bad")).toBe("-");
  });
});

/* ---------- Lease end and renewal ---------- */

describe("daysToEndText", () => {
  it("counts down while the lease runs", () => {
    expect(daysToEndText(makeRow({ daysToLeaseEnd: 52 }))).toBe("Ends in 52 days");
    expect(daysToEndText(makeRow({ daysToLeaseEnd: 1 }))).toBe("Ends tomorrow");
    expect(daysToEndText(makeRow({ daysToLeaseEnd: 0 }))).toBe("Ends today");
  });
  it("never shows a negative number", () => {
    const past = makeRow({ daysToLeaseEnd: -5, renewalAlert: "ENDED", lease: { ...makeRow().lease!, endDate: "2026-11-14" } });
    expect(daysToEndText(past)).toBe("Ended Nov 14, 2026");
    // Even if the alert were missing.
    expect(daysToEndText({ ...past, renewalAlert: null })).toBe("Ended Nov 14, 2026");
  });
  it("shows Ended with the end date for ended / terminated leases (daysToLeaseEnd null)", () => {
    const ended = makeRow({ daysToLeaseEnd: null, renewalAlert: "ENDED", lease: { ...makeRow().lease!, status: "TERMINATED", endDate: "2026-06-30" } });
    expect(isLeaseEnded(ended)).toBe(true);
    expect(daysToEndText(ended)).toBe("Ended Jun 30, 2026");
  });
  it("is null on vacant rows and active leases without an end date", () => {
    expect(daysToEndText(vacantRow())).toBeNull();
    expect(daysToEndText(makeRow({ daysToLeaseEnd: null, renewalAlert: null, lease: { ...makeRow().lease!, endDate: null } }))).toBeNull();
  });
});

describe("renewalText", () => {
  it("names the next lease", () => {
    expect(renewalText({ status: "ACTIVE", sharesTenant: true })).toBe("Renewed");
    expect(renewalText({ status: "DRAFT", sharesTenant: true })).toBe("Renewal drafted");
    expect(renewalText({ status: "DRAFT", sharesTenant: false })).toBe("Next tenant");
    expect(renewalText({ status: "ACTIVE", sharesTenant: false })).toBe("Next tenant");
  });
});

/* ---------- Filters ---------- */

describe("reserved units", () => {
  const reserved = vacantRow({ unit: { id: "u3", unitNumber: "Office", status: "RESERVED", monthlyRent: "0.00", property: { id: "p1", name: "Fieldstone" } } });
  it("reads Reserved, not Vacant, and hides its vacant months", () => {
    expect(isReservedRow(reserved)).toBe(true);
    expect(isReservedRow(vacantRow())).toBe(false);
    expect(isReservedRow(makeRow({ unit: { ...makeRow().unit, status: "RESERVED" } }))).toBe(false);
    expect(rowTitle(reserved)).toBe("Reserved");
    expect(rowTitle(vacantRow())).toBe("Vacant");
    expect(rowTitle(makeRow())).toBe("Ana Reyes, Ben Cole");
    expect(shownVacantMonths(reserved)).toEqual([]);
    expect(shownVacantMonths(vacantRow())).toHaveLength(11);
    expect(cellDisplay(cell("2026-05", "VACANT"), true)).toBe("Reserved");
    expect(cellDescription(cell("2026-05", "VACANT"), true)).toBe("May 2026 · Unit reserved");
  });
  it("is left out of the Vacant chip but found by searching 'reserved'", () => {
    expect(hasVacancy(reserved)).toBe(false);
    expect(matchesChips(reserved, ["vacant"])).toBe(false);
    expect(filterYearRows([reserved, vacantRow()], "reserved", [])).toEqual([reserved]);
  });
});

describe("chips", () => {
  it("reads ?chips= in toolbar order and drops unknown values", () => {
    expect(chipsFromParam("vacant,ends-soon,nope")).toEqual(["ends-soon", "vacant"]);
    expect(chipsFromParam(null)).toEqual([]);
  });
  it("matches each chip", () => {
    const unpaid = makeRow({ renewalAlert: null, months: MONTHS.map((m) => cell(m, m === "2026-03" ? "OVERDUE" : "PAID")) });
    expect(hasUnpaidMonths(unpaid)).toBe(true);
    expect(hasUnpaidMonths(makeRow())).toBe(false);
    expect(hasVacancy(vacantRow())).toBe(true);
    expect(hasVacancy(makeRow({ vacantMonths: ["2026-01"] }))).toBe(true);
    expect(hasVacancy(makeRow())).toBe(false);
    expect(matchesChips(makeRow(), ["ends-soon"])).toBe(true);
    expect(matchesChips(unpaid, ["ends-soon"])).toBe(false);
    expect(matchesChips(unpaid, ["unpaid"])).toBe(true);
  });
  it("narrows with every active chip", () => {
    const both = makeRow({ months: MONTHS.map((m) => cell(m, m === "2026-03" ? "UNPAID" : "PAID")) });
    expect(matchesChips(both, ["ends-soon", "unpaid"])).toBe(true);
    expect(matchesChips(makeRow(), ["ends-soon", "unpaid"])).toBe(false);
  });
});

describe("filterYearRows", () => {
  const rows = [makeRow(), vacantRow()];
  it("searches tenants (co-tenants too), unit, property and 'vacant'", () => {
    expect(filterYearRows(rows, "ben", [])).toHaveLength(1);
    expect(filterYearRows(rows, "unit 2", [])).toEqual([rows[1]]);
    expect(filterYearRows(rows, "fieldstone", [])).toHaveLength(2);
    expect(filterYearRows(rows, "vacant", [])).toEqual([rows[1]]);
    expect(filterYearRows(rows, "  ", [])).toHaveLength(2);
  });
  it("combines search and chips", () => {
    expect(filterYearRows(rows, "fieldstone", ["vacant"])).toEqual([rows[1]]);
    expect(filterYearRows(rows, "ana", ["vacant"])).toEqual([]);
  });
});

describe("groupByProperty", () => {
  const a = makeRow();
  const b = vacantRow();
  const c = makeRow({ unit: { ...makeRow().unit, id: "u9", property: { id: "p2", name: "Birch" } }, lease: { ...makeRow().lease!, id: "l9" } });
  const propertyTotals: RentRollYearResponse["propertyTotals"] = [
    { ...totals("100.00"), property: { id: "p2", name: "Birch" } },
    { ...totals("200.00"), property: { id: "p1", name: "Fieldstone" } },
  ];
  it("follows propertyTotals order and keeps the API row order", () => {
    const groups = groupByProperty([a, b, c], propertyTotals);
    expect(groups.map((g) => g.property.name)).toEqual(["Birch", "Fieldstone"]);
    expect(groups[1]!.rows).toEqual([a, b]);
    expect(groups[0]!.totals.totalPaid).toBe("100.00");
  });
  it("drops properties with no rows left after filtering", () => {
    expect(groupByProperty([c], propertyTotals).map((g) => g.property.id)).toEqual(["p2"]);
  });
  it("links to the lease page with the year to come back to", () => {
    expect(yearLeasePath("l 1", 2026, "ledger")).toBe("/leases/l%201?tab=ledger&from=rent-roll&view=year&year=2026");
    expect(yearLeasePath("l1", 2025)).toBe("/leases/l1?from=rent-roll&view=year&year=2025");
  });
  it("keys rows by lease, or unit when vacant", () => {
    expect(yearRowKey(a)).toBe("lease-l1");
    expect(yearRowKey(b)).toBe("unit-u2");
  });
});
