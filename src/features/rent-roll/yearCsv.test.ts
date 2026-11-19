import { describe, expect, it } from "vitest";
import { buildYearCsv, csvField, csvMoney, csvText, yearCsvFilename, yearCsvHeader } from "@/features/rent-roll/yearCsv";
import type { RentRollYearCell, RentRollYearResponse, RentRollYearRow, RentRollYearTotals } from "@/types/rentRoll";

const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

const cells = (status: RentRollYearCell["status"], paid: string, leaseIds: string[] = []): RentRollYearCell[] =>
  MONTHS.map((month) => ({ month, status, paid, charged: paid, balance: "0.00", leaseIds, leaseId: leaseIds[leaseIds.length - 1] ?? null }));

function totals(paid: string, year: string, lateFees = "0.00"): RentRollYearTotals {
  return { months: MONTHS.map((month) => ({ month, charged: paid, paid })), totalCharged: year, totalPaid: year, lateFees };
}

const leaseRow: RentRollYearRow = {
  kind: "LEASE",
  unit: { id: "u1", unitNumber: "4B", status: "OCCUPIED", monthlyRent: "2900", property: { id: "p1", name: "Oak, Main & Co" } },
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
      { id: "t1", fullName: 'Ana "AJ" Reyes', isPrimary: true },
      { id: "t2", fullName: "=HYPERLINK(\"x\")", isPrimary: false },
    ],
  },
  leases: [],
  months: cells("PAID", "2850.00", ["l1"]),
  totalCharged: "34200.00",
  totalPaid: "34200.00",
  lateFees: "75.00",
  vacantMonths: [],
  daysToLeaseEnd: 42,
  renewalAlert: "ENDS_SOON",
  nextLease: { id: "l2", leaseNumber: "LSE-2027-001", status: "DRAFT", startDate: "2027-01-01", sharesTenant: true },
};

// The unit's leases: an earlier tenant (Jan–Mar of 2026), and the current lease.
leaseRow.leases = [
  { ...leaseRow.lease!, id: "l0", leaseNumber: "LSE-2025-003", status: "ENDED", tenants: [{ id: "t0", fullName: "Jo Park", isPrimary: true }], monthsCovered: MONTHS.slice(0, 3) },
  { ...leaseRow.lease!, monthsCovered: MONTHS },
];

const vacantRow: RentRollYearRow = {
  kind: "VACANT_UNIT",
  unit: { id: "u2", unitNumber: "5", status: "VACANT", monthlyRent: "2700.00", property: { id: "p2", name: "Birch" } },
  lease: null,
  leases: [],
  months: MONTHS.map((month) => ({ month, status: month <= "2026-11" ? "VACANT" : "FUTURE", paid: "0.00", charged: "0.00", balance: "0.00", leaseIds: [], leaseId: null })),
  totalCharged: "0.00",
  totalPaid: "0.00",
  lateFees: "0.00",
  vacantMonths: MONTHS.slice(0, 11),
  daysToLeaseEnd: null,
  renewalAlert: null,
  nextLease: null,
};

const reservedRow: RentRollYearRow = {
  ...vacantRow,
  unit: { id: "u3", unitNumber: "Office", status: "RESERVED", monthlyRent: "0.00", property: { id: "p2", name: "Birch" } },
};

const endedRow: RentRollYearRow = {
  ...leaseRow,
  unit: { ...leaseRow.unit, id: "u4", unitNumber: "4C" },
  lease: { ...leaseRow.lease!, id: "l3", status: "ACTIVE", endDate: "2026-11-10", tenants: [{ id: "t3", fullName: "Cy", isPrimary: true }] },
  leases: [],
  daysToLeaseEnd: -9,
  renewalAlert: "ENDED",
  nextLease: null,
};

const data: RentRollYearResponse = {
  year: 2026,
  rowsBy: "unit",
  months: MONTHS,
  availableYears: { from: 2025, to: 2027 },
  rows: [vacantRow, reservedRow, leaseRow, endedRow],
  propertyTotals: [
    { ...totals("0.00", "0.00"), property: { id: "p2", name: "Birch" } },
    { ...totals("5700.00", "68400.00", "75.00"), property: { id: "p1", name: "Oak, Main & Co" } },
  ],
  totals: totals("5700.00", "68400.00", "75.00"),
};

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);

/** Minimal CSV reader for the test: handles quoted fields and doubled quotes. */
function parse(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]!;
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === CR && csv[i + 1] === LF) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else field += ch;
  }
  return rows;
}

describe("csv helpers", () => {
  it("writes money as plain numbers with 2 decimals", () => {
    expect(csvMoney("2900")).toBe("2900.00");
    expect(csvMoney("2500.5")).toBe("2500.50");
    expect(csvMoney("-150.00")).toBe("-150.00");
    expect(csvMoney("1234567.89")).toBe("1234567.89");
    expect(csvMoney(null)).toBe("");
  });
  it("guards formulas in text, quotes special characters", () => {
    expect(csvText("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvText("-x")).toBe("'-x");
    expect(csvText("@me")).toBe("'@me");
    expect(csvText("Ana")).toBe("Ana");
    expect(csvField('a "b", c')).toBe('"a ""b"", c"');
    expect(csvField("plain")).toBe("plain");
  });
  it("names the file after the year and property", () => {
    expect(yearCsvFilename(2026)).toBe("Rent roll 2026.csv");
    expect(yearCsvFilename(2026, 'Oak: "Main"/West')).toBe("Rent roll 2026 - Oak MainWest.csv");
  });
});

describe("buildYearCsv", () => {
  const csv = buildYearCsv(data);
  const table = parse(csv);
  const header = table[0]!;
  const col = (name: string) => header.indexOf(name);

  it("has a header with 12 month columns and CRLF lines, every line the same width", () => {
    expect(header).toEqual(yearCsvHeader(MONTHS));
    expect(header).toContain("Jan 2026 paid");
    expect(header).toContain("Dec 2026 paid");
    expect(csv.endsWith("\r\n")).toBe(true);
    for (const line of table) expect(line).toHaveLength(header.length);
  });

  it("groups rows under propertyTotals order with a subtotal after each property and a grand total last", () => {
    expect(table.slice(1).map((r) => [r[0], r[1]])).toEqual([
      ["Birch", "5"],
      ["Birch", "Office"],
      ["Birch", "Subtotal"],
      ["Oak, Main & Co", "4B"],
      ["Oak, Main & Co", "4C"],
      ["Oak, Main & Co", "Subtotal"],
      ["Total", ""],
    ]);
  });

  it("writes a unit row: current tenants, earlier tenants, money, dates, renewal", () => {
    const r = table[4]!;
    expect(r[col("Tenants")]).toBe(`Ana "AJ" Reyes; =HYPERLINK("x")`); // starts with "Ana": not a formula
    expect(header.indexOf("Earlier tenants")).toBe(col("Tenants") + 1);
    expect(r[col("Earlier tenants")]).toBe("Jo Park (Jan–Mar)");
    expect(table[5]![col("Earlier tenants")]).toBe("");
    expect(r[col("Current rent")]).toBe("2850.00");
    expect(r[col("Market rent")]).toBe("2900.00");
    expect(r[col("Lease start")]).toBe("2026-01-01");
    expect(r[col("Jan 2026 paid")]).toBe("2850.00");
    expect(r[col("Total paid")]).toBe("34200.00");
    expect(r[col("Late fees")]).toBe("75.00");
    expect(r[col("Renewal alert")]).toBe("Ends soon");
    expect(r[col("Days to lease end")]).toBe("42");
    expect(r[col("Next lease")]).toBe("Renewal drafted LSE-2027-001");
  });

  it("never writes a negative day count for an ended lease", () => {
    const r = table[5]!;
    expect(r[col("Renewal alert")]).toBe("Ended");
    expect(r[col("Days to lease end")]).toBe("");
  });

  it("writes a vacant row: Vacant tenant, blank vacant months, the count", () => {
    const r = table[1]!;
    expect(r[col("Tenants")]).toBe("Vacant");
    expect(r[col("Jan 2026 paid")]).toBe("");
    expect(r[col("Dec 2026 paid")]).toBe("0.00");
    expect(r[col("Vacant months")]).toBe("11");
  });

  it("writes a reserved unit as Reserved with no vacant months", () => {
    const r = table[2]!;
    expect(r[col("Tenants")]).toBe("Reserved");
    expect(r[col("Vacant months")]).toBe("0");
  });

  it("copies subtotals and the total from the API", () => {
    const sub = table[6]!;
    expect(sub[col("Jan 2026 paid")]).toBe("5700.00");
    expect(sub[col("Total paid")]).toBe("68400.00");
    expect(sub[col("Late fees")]).toBe("75.00");
    const total = table[7]!;
    expect(total[col("Total charged")]).toBe("68400.00");
    expect(total[col("Tenants")]).toBe("");
  });
});
