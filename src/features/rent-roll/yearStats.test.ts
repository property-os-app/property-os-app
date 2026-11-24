import { describe, expect, it } from "vitest";
import {
  CELL_STATUSES,
  cellDescription,
  cellDisplay,
  cellTenants,
  collectedLabel,
  collectedPercent,
  collectedTone,
  monthCellClass,
  monthRange,
  otherLeases,
  LEGEND_STATUSES,
  tenantsWithMonths,
  cellStatusLabels,
  cellTone,
  chipsFromParam,
  daysToEndText,
  filterYearRows,
  groupByProperty,
  groupCountText,
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
  yearSearchText,
  yearSummary,
  isUnitRow,
  isYearResponse,
  rowsFromParam,
  rowsSwitchParams,
  shownCell,
  shownRenewalAlert,
  tenantColumnHeader,
} from "@/features/rent-roll/yearStats";
import type {
  RentRollYearCell,
  RentRollYearCellStatus,
  RentRollYearLease,
  RentRollYearLeaseRow,
  RentRollYearResponse,
  RentRollYearTotals,
  RentRollYearUnitCell,
  RentRollYearUnitRow,
} from "@/types/rentRoll";

/* ---------- Hand-written fixtures in the API sample's shape ---------- */

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

function cell(month: string, status: RentRollYearCellStatus, paid = "0.00", charged = "0.00", balance = "0.00", leaseIds: string[] = []): RentRollYearUnitCell {
  return { month, status, paid, charged, balance, leaseIds, leaseId: leaseIds[leaseIds.length - 1] ?? null };
}

const LEASE: RentRollYearLease = {
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
};

function makeRow(over: Partial<RentRollYearUnitRow> = {}): RentRollYearUnitRow {
  return {
    kind: "LEASE",
    unit: { id: "u1", unitNumber: "1", status: "OCCUPIED", monthlyRent: "2900.00", property: { id: "p1", name: "Fieldstone" } },
    lease: LEASE,
    leases: [{ ...LEASE, monthsCovered: MONTHS }],
    months: MONTHS.map((m) => cell(m, "PAID", "2850.00", "2850.00", "0.00", ["l1"])),
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

const vacantRow = (over: Partial<RentRollYearUnitRow> = {}) =>
  makeRow({
    kind: "VACANT_UNIT",
    lease: null,
    leases: [],
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

  it("keeps the legend to Paid, Partial, Unpaid, Overdue and Vacant; not billed / future / outside lease are plain cells", () => {
    expect(LEGEND_STATUSES).toEqual(["PAID", "PARTIAL", "UNPAID", "OVERDUE", "VACANT"]);
    for (const s of ["NOT_BILLED", "FUTURE", "OUTSIDE_LEASE"] as const) expect(cellTone[s].cell).toBe("text-text-muted");
  });

  it("keeps the paid tint faintly visible in dark mode", () => {
    expect(cellTone.PAID.cell).toContain("dark:bg-success-soft");
  });
});

describe("cellDisplay", () => {
  it("shows the paid amount in short money on money statuses, even $0", () => {
    expect(cellDisplay(cell("2026-10", "PARTIAL", "1000.00", "2850.00", "1850.00"))).toBe("$1,000");
    expect(cellDisplay(cell("2026-10", "PARTIAL", "2150.50", "2850.00", "699.50"))).toBe("$2,150.50");
    expect(cellDisplay(cell("2026-10", "UNPAID", "0.00", "2850.00", "2850.00"))).toBe("$0");
  });
  it("leaves vacant and unpaid future months empty, and a dash outside a lease", () => {
    expect(cellDisplay(cell("2026-05", "VACANT"))).toBe("");
    expect(cellDisplay(cell("2026-12", "FUTURE"))).toBe("");
    expect(cellDisplay(cell("2026-12", "OUTSIDE_LEASE"))).toBeNull();
    expect(cellDisplay(cell("2026-11", "NOT_BILLED"))).toBeNull();
    expect(cellDisplay(cell("2026-12", "FUTURE", "500.00"))).toBe("$500");
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
    expect(cellDescription(cell("2026-05", "VACANT"))).toBe("May 2026 · Vacant");
    expect(cellDescription(cell("2026-12", "OUTSIDE_LEASE"))).toBe("Dec 2026 · No lease this month");
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
    expect(cellDescription(cell("2026-05", "VACANT"), { reserved: true })).toBe("May 2026 · Reserved");
    // Reserved months get their own stripes (another neutral shade than vacant).
    expect(monthCellClass(cell("2026-05", "VACANT"), true)).not.toBe(monthCellClass(cell("2026-05", "VACANT")));
    expect(monthCellClass(cell("2026-05", "VACANT"), true)).toContain("repeating-linear-gradient");
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
    expect(hasVacancy(makeRow({ months: MONTHS.map((m) => cell(m, m === "2026-01" ? "VACANT" : "PAID")) }))).toBe(true);
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
  it("keys rows by unit", () => {
    expect(yearRowKey(a)).toBe("unit-u1");
    expect(yearRowKey(b)).toBe("unit-u2");
  });
});

/* ---------- A unit's leases (rows=unit) ---------- */

describe("a unit with two leases in the year", () => {
  const john: RentRollYearLease = { ...LEASE, id: "old", leaseNumber: "LSE-2025-009", status: "ENDED", tenants: [{ id: "t9", fullName: "John Smith", isPrimary: true }] };
  const sarah: RentRollYearLease = {
    ...LEASE,
    id: "new",
    leaseNumber: "LSE-2026-004",
    tenants: [
      { id: "t5", fullName: "Sarah Lee", isPrimary: true },
      { id: "t6", fullName: "Tom Lee", isPrimary: false },
    ],
  };
  // John Jan-Apr; both in April (move-out + move-in); Sarah from April. A carried-balance lease with no months is ignored.
  const carried: RentRollYearLease = { ...LEASE, id: "carry", leaseNumber: "LSE-2024-001", status: "ENDED", tenants: [{ id: "t0", fullName: "Old Owing", isPrimary: true }] };
  const row = makeRow({
    lease: sarah,
    leases: [
      { ...carried, monthsCovered: [] },
      { ...john, monthsCovered: MONTHS.slice(0, 4) },
      { ...sarah, monthsCovered: MONTHS.slice(3) },
    ],
    months: MONTHS.map((m, i) =>
      i < 3
        ? cell(m, "PAID", "2000.00", "2000.00", "0.00", ["old"])
        : i === 3
          ? cell(m, "OVERDUE", "2000.00", "4000.00", "2000.00", ["old", "new"])
          : cell(m, "PAID", "2000.00", "2000.00", "0.00", ["new"]),
    ),
  });

  it("lists earlier tenants with their month range, skipping empty monthsCovered", () => {
    expect(monthRange(MONTHS.slice(0, 4))).toBe("Jan–Apr");
    expect(monthRange(["2026-03"])).toBe("Mar");
    expect(monthRange([])).toBe("");
    expect(otherLeases(row).earlier.map((l) => l.id)).toEqual(["old"]);
    expect(tenantsWithMonths(otherLeases(row).earlier)).toBe("John Smith (Jan–Apr)");
    expect(otherLeases(makeRow()).earlier).toEqual([]);
    const three = makeRow({
      lease: sarah,
      leases: [
        { ...john, monthsCovered: MONTHS.slice(0, 3) },
        { ...john, id: "mid", tenants: [{ id: "t7", fullName: "Bo Diaz", isPrimary: true }], monthsCovered: MONTHS.slice(3, 6) },
        { ...sarah, monthsCovered: MONTHS.slice(6) },
      ],
    });
    expect(tenantsWithMonths(otherLeases(three).earlier)).toBe("John Smith (Jan–Mar), Bo Diaz (Apr–Jun)");
  });

  it("names the tenant in the tooltip, both when two leases share a month", () => {
    const jan = row.months[0]!;
    const apr = row.months[3]!;
    expect(cellTenants(row, jan)).toBe("John Smith");
    expect(cellTenants(row, apr)).toBe("John Smith → Sarah Lee");
    expect(cellDescription(jan, { tenants: cellTenants(row, jan) })).toBe("Jan 2026 · John Smith · Paid $2,000.00 of $2,000.00 · Paid");
    expect(cellDescription(apr, { tenants: cellTenants(row, apr) })).toBe(
      "Apr 2026 · John Smith → Sarah Lee · Paid $2,000.00 of $4,000.00 · Balance $2,000.00 · Overdue · balance includes earlier months",
    );
    expect(cellTenants(vacantRow(), vacantRow().months[0]!)).toBe("");
  });

  it("finds the unit by an earlier tenant or lease number", () => {
    expect(yearSearchText(row)).toEqual(expect.arrayContaining(["John Smith", "Sarah Lee", "Tom Lee", "LSE-2025-009", "LSE-2026-004"]));
    expect(filterYearRows([row, vacantRow()], "john smith", [])).toEqual([row]);
  });
});

/* ---------- Collected and summary ---------- */

describe("collectedPercent", () => {
  it("is paid ÷ charged with one decimal, in cents", () => {
    expect(collectedPercent("37475.00", "37475.00")).toBe(100);
    expect(collectedPercent("278600.00", "288400.00")).toBe(96.6);
    expect(collectedPercent("0.10", "0.30")).toBe(33.3);
    expect(collectedPercent("0.00", "2000.00")).toBe(0);
    expect(collectedPercent("2100.00", "2000.00")).toBe(105);
  });
  it("is null when nothing was charged", () => {
    expect(collectedPercent("0.00", "0.00")).toBeNull();
    expect(collectedPercent("50.00", "0.00")).toBeNull();
  });
  it("labels whole percents, never rounding up to 100%", () => {
    expect(collectedLabel(96.6)).toBe("96%");
    expect(collectedLabel(99.9)).toBe("99%");
    expect(collectedLabel(100)).toBe("100%");
    expect(collectedLabel(105.4)).toBe("105%");
    expect(collectedLabel(null)).toBe("-");
  });
  it("tones the bar: full is calm, short is amber then red", () => {
    expect(collectedTone(100)).toBe("success");
    expect(collectedTone(95)).toBe("warning");
    expect(collectedTone(60)).toBe("danger");
  });
});

describe("yearSummary", () => {
  it("counts vacant unit-months (not reserved), ends soon and units with unpaid months", () => {
    const reserved = vacantRow({ unit: { id: "u3", unitNumber: "Office", status: "RESERVED", monthlyRent: "0.00", property: { id: "p1", name: "Fieldstone" } } });
    const unpaid = makeRow({ renewalAlert: null, months: MONTHS.map((m) => cell(m, m === "2026-03" ? "UNPAID" : "PAID")) });
    expect(yearSummary([makeRow(), vacantRow(), reserved, unpaid])).toEqual({ vacantUnitMonths: 11, endsSoon: 1, unpaidUnits: 1 });
    expect(yearSummary([])).toEqual({ vacantUnitMonths: 0, endsSoon: 0, unpaidUnits: 0 });
  });
});

/* ---------- By unit | By tenant (rows=unit / rows=lease) ---------- */

/** A rows=unit cell as rows=lease sends it (no leaseIds / leaseId). */
const toLeaseCell = (c: RentRollYearCell): RentRollYearCell => ({ month: c.month, charged: c.charged, paid: c.paid, balance: c.balance, status: c.status });

/** A rows=unit row as rows=lease sends it: no `leases`, plain cells. */
function toLeaseRow(r: RentRollYearUnitRow): RentRollYearLeaseRow {
  const out: Partial<RentRollYearUnitRow> = { ...r };
  delete out.leases;
  return { ...(out as RentRollYearLeaseRow), months: r.months.map(toLeaseCell) };
}

/** A rows=lease row: the lease's own cells (no leaseIds), no `leases`. */
function leaseModeRow(over: Partial<RentRollYearLeaseRow> = {}): RentRollYearLeaseRow {
  return { ...toLeaseRow(makeRow()), ...over };
}

describe("the rows switch", () => {
  it("reads ?rows=: lease, else unit", () => {
    expect(rowsFromParam("lease")).toBe("lease");
    expect(rowsFromParam("unit")).toBe("unit");
    expect(rowsFromParam(null)).toBe("unit");
    expect(rowsFromParam("tenant")).toBe("unit");
  });
  it("writes ?rows=lease, and removes it for unit (the default), keeping the other params", () => {
    const lease = rowsSwitchParams(new URLSearchParams("view=year&year=2026&q=ana&chips=unpaid"), "lease");
    expect(lease.toString()).toBe("view=year&year=2026&q=ana&chips=unpaid&rows=lease");
    const unit = rowsSwitchParams(lease, "unit");
    expect(unit.has("rows")).toBe(false);
    expect(unit.get("q")).toBe("ana");
  });
  it("drops ?rows= when switching to the month view", () => {
    expect(viewSwitchParams(new URLSearchParams("view=year&year=2026&rows=lease"), "month", "2026").has("rows")).toBe(false);
  });
  it("names the first column per mode", () => {
    expect(tenantColumnHeader("unit")).toBe("Unit · Tenants");
    expect(tenantColumnHeader("lease")).toBe("Tenant · Unit");
  });
});

describe("rows by tenant (one row per lease)", () => {
  const john: RentRollYearLease = { ...LEASE, id: "old", leaseNumber: "LSE-2025-009", status: "ENDED", tenants: [{ id: "t9", fullName: "John Smith", isPrimary: true }] };
  // Unit 1: John Jan-Mar, vacant Apr, Ana May-Dec.
  const older = leaseModeRow({
    lease: john,
    months: MONTHS.map((m, i) => (i < 3 ? cell(m, "PAID", "2000.00", "2000.00") : i === 3 ? cell(m, "VACANT") : cell(m, "OUTSIDE_LEASE"))),
    vacantMonths: ["2026-04"],
    renewalAlert: "ENDED",
  });
  const newer = leaseModeRow({
    months: MONTHS.map((m, i) => (i < 3 ? cell(m, "OUTSIDE_LEASE") : i === 3 ? cell(m, "VACANT") : cell(m, "UNPAID", "0.00", "2850.00", "2850.00"))),
    vacantMonths: ["2026-04"],
  });
  const vacant = toLeaseRow(vacantRow());

  it("tells the row shapes apart", () => {
    expect(isUnitRow(makeRow())).toBe(true);
    expect(isUnitRow(older)).toBe(false);
  });

  it("keys each lease row by its lease (the unit shows twice), a vacant unit by the unit", () => {
    expect(yearRowKey(older)).toBe("lease-old");
    expect(yearRowKey(newer)).toBe("lease-l1");
    expect(yearRowKey(vacant)).toBe("unit-u2");
    expect(yearRowKey(makeRow())).toBe("unit-u1");
  });

  it("shows months outside the lease as a muted dash: a lease row's vacant month too, a vacant unit keeps its stripes", () => {
    const apr = shownCell(older, older.months[3]!);
    expect(apr.status).toBe("OUTSIDE_LEASE");
    expect(cellDisplay(apr)).toBeNull();
    expect(monthCellClass(apr)).toBe("text-text-muted");
    expect(cellDisplay(shownCell(older, older.months[5]!))).toBeNull();
    expect(shownCell(vacant, vacant.months[0]!).status).toBe("VACANT");
    expect(shownCell(makeRow(), cell("2026-04", "VACANT")).status).toBe("VACANT");
  });

  it("uses the same cell colours as by unit", () => {
    expect(monthCellClass(newer.months[6])).toBe(cellTone.UNPAID.cell);
    expect(cellDisplay(older.months[0]!)).toBe("$2,000");
  });

  it("names the row's own tenant in the tooltip, only in that lease's months", () => {
    expect(cellTenants(older, older.months[0]!)).toBe("John Smith");
    expect(cellTenants(older, shownCell(older, older.months[3]!))).toBe("");
    expect(cellTenants(newer, newer.months[6]!)).toBe("Ana Reyes");
    expect(cellTenants(vacant, vacant.months[0]!)).toBe("");
  });

  it("searches each row by its own lease only", () => {
    expect(yearSearchText(older)).toEqual(expect.arrayContaining(["John Smith", "LSE-2025-009"]));
    expect(yearSearchText(older)).not.toContain("Ana Reyes");
    expect(filterYearRows([older, newer, vacant], "john", [])).toEqual([older]);
    expect(filterYearRows([older, newer, vacant], "", ["unpaid"])).toEqual([newer]);
  });

  it("counts each unit once in the summary (vacant months, unpaid units)", () => {
    expect(yearSummary([older, newer, vacant])).toEqual({ vacantUnitMonths: 12, endsSoon: 1, unpaidUnits: 1 });
  });

  it("groups both leases of a unit under its property, older first (the API's order)", () => {
    const groups = groupByProperty([older, newer, vacant], [{ ...totals(), property: { id: "p1", name: "Fieldstone" } }]);
    expect(groups[0]!.rows).toEqual([older, newer, vacant]);
  });
});

describe("groupCountText (the property band's count)", () => {
  const asLease = (row: RentRollYearUnitRow) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "leases")) as unknown as RentRollYearLeaseRow;
  const unit = (id: string) => makeRow({ unit: { ...makeRow().unit, id } });
  it("counts units by unit", () => {
    expect(groupCountText([unit("u1"), unit("u2")])).toBe("2 units");
    expect(groupCountText([unit("u1")])).toBe("1 unit");
  });
  it("counts each unit once by tenant, and its leases", () => {
    expect(groupCountText([unit("u1"), unit("u1"), unit("u2")].map(asLease))).toBe("2 units · 3 leases");
    expect(groupCountText([asLease(unit("u1"))])).toBe("1 unit · 1 lease");
  });
  it("counts a vacant unit as a unit without a lease", () => {
    expect(groupCountText([asLease(unit("u1")), asLease(vacantRow())])).toBe("2 units · 1 lease");
  });
});

describe("shownRenewalAlert (the badge in the table's first column)", () => {
  const unitRow = makeRow();
  const leaseRow = Object.fromEntries(Object.entries(makeRow()).filter(([key]) => key !== "leases")) as unknown as RentRollYearLeaseRow;
  it("shows Ends soon by unit and by tenant", () => {
    expect(shownRenewalAlert({ ...unitRow, renewalAlert: "ENDS_SOON" })).toBe("ENDS_SOON");
    expect(shownRenewalAlert({ ...leaseRow, renewalAlert: "ENDS_SOON" })).toBe("ENDS_SOON");
  });
  it("shows Ended by unit only", () => {
    expect(shownRenewalAlert({ ...unitRow, renewalAlert: "ENDED" })).toBe("ENDED");
    expect(shownRenewalAlert({ ...leaseRow, renewalAlert: "ENDED" })).toBeNull();
  });
  it("shows nothing without an alert", () => {
    expect(shownRenewalAlert({ ...unitRow, renewalAlert: null })).toBeNull();
  });
});

describe("isYearResponse (an older backend never crashes the page)", () => {
  const base = { year: 2026, months: MONTHS, availableYears: { from: 2025, to: 2027 }, propertyTotals: [{ ...totals(), property: { id: "p1", name: "Fieldstone" } }], totals: totals() };
  const byUnit: RentRollYearResponse = { ...base, rowsBy: "unit", rows: [makeRow(), vacantRow()] };
  const byLease: RentRollYearResponse = { ...base, rowsBy: "lease", rows: [leaseModeRow()] };

  it("accepts both shapes for the mode asked", () => {
    expect(isYearResponse(byUnit, "unit")).toBe(true);
    expect(isYearResponse(byLease, "lease")).toBe(true);
    expect(isYearResponse({ ...base, rowsBy: "unit", rows: [] }, "unit")).toBe(true);
  });

  it("rejects an unknown shape", () => {
    expect(isYearResponse(byUnit, "lease")).toBe(false); // rowsBy doesn't echo the mode
    expect(isYearResponse(byLease, "unit")).toBe(false);
    const noRowsBy: Record<string, unknown> = { ...byUnit }; // a backend before ?rows=
    delete noRowsBy.rowsBy;
    expect(isYearResponse(noRowsBy, "unit")).toBe(false);
    expect(isYearResponse({ ...byLease, rowsBy: "unit" }, "unit")).toBe(false); // unit mode without leases / leaseIds
    expect(isYearResponse({ ...byUnit, months: MONTHS.slice(0, 6) }, "unit")).toBe(false);
    expect(isYearResponse({ ...byUnit, totals: null }, "unit")).toBe(false);
    expect(isYearResponse({ ...byUnit, rows: [{ ...makeRow(), months: [] }] }, "unit")).toBe(false);
    expect(isYearResponse(null, "unit")).toBe(false);
    expect(isYearResponse("<html>", "unit")).toBe(false);
    expect(isYearResponse([], "unit")).toBe(false);
  });
});
