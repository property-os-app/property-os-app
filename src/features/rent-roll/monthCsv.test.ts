import { describe, expect, it } from "vitest";
import { buildMonthCsv, MONTH_CSV_HEADER, monthCsvFilename } from "@/features/rent-roll/monthCsv";
import { centsToCsv, csvLines, propertySuffix } from "@/features/rent-roll/rentRollCsv";
import type { RentRollResponse, RentRollRow } from "@/types/rentRoll";

function row(over: Partial<RentRollRow> = {}): RentRollRow {
  return {
    leaseId: "l1",
    leaseNumber: "L-0001",
    leaseStatus: "ACTIVE",
    unit: { id: "u1", unitNumber: "2", property: { id: "p1", name: "Birch Hollow" } },
    primaryTenant: { id: "t1", fullName: "Ana Ruiz" },
    rent: "1850.00",
    depositHeld: "1850.00",
    dueDate: "2026-11-01",
    openingBalance: "0.00",
    charged: "1850.00",
    paid: "1850.00",
    rentPaid: "1850.00",
    remaining: "0.00",
    balance: "0.00",
    oldestUnpaidDueDate: null,
    status: "PAID",
    lastPaymentDate: "2026-11-02",
    ...over,
  };
}

const summary: RentRollResponse["summary"] = {
  totalRentDue: "0.00",
  collected: "0.00",
  collectionRate: null,
  outstandingBalance: "0.00",
  overdueCount: 0,
  overdueTotal: "0.00",
  securityDepositsHeld: "0.00",
  activeDepositCount: 0,
};

const parse = (csv: string) => csv.trimEnd().split("\r\n");

describe("buildMonthCsv", () => {
  const data: RentRollResponse = {
    month: "2026-11",
    summary,
    rows: [
      row(),
      row({
        leaseId: "l2",
        leaseNumber: "L-0002",
        unit: { id: "u2", unitNumber: "B", property: { id: "p1", name: "Birch Hollow" } },
        primaryTenant: { id: "t2", fullName: "=HYPERLINK(1)" },
        openingBalance: "1200.50",
        charged: "1,850.00",
        paid: "0.00",
        // Half of November's rent was paid later (in December): rent paid counts it, cash received in November doesn't.
        rentPaid: "925.00",
        remaining: "925.00",
        balance: "3050.50",
        status: "OVERDUE",
        oldestUnpaidDueDate: "2026-10-01",
        lastPaymentDate: null,
        depositHeld: null,
      }),
      row({ leaseId: "l3", leaseNumber: "L-0003", leaseStatus: "ENDED", primaryTenant: null, rent: null, dueDate: null, charged: "0.00", paid: "0.00", rentPaid: "0.00", remaining: "0.00", openingBalance: "-75.25", balance: "-75.25", status: "UNPAID" }),
    ],
  };
  const lines = parse(buildMonthCsv(data));

  it("has the header, one line per row in the API's order, then a Total line, with CRLF line ends", () => {
    expect(lines[0]).toBe(MONTH_CSV_HEADER.join(","));
    expect(lines).toHaveLength(5);
    expect(buildMonthCsv(data).endsWith("\r\n")).toBe(true);
  });

  it("writes money as plain numbers, the unit label, labels and raw dates", () => {
    expect(lines[1]).toBe("Birch Hollow,Unit 2,Ana Ruiz,L-0001,Active,1850.00,2026-11-01,0.00,1850.00,1850.00,1850.00,0.00,0.00,Paid,,2026-11-02,1850.00");
    // "B" isn't a number, so it stays as it is; a comma in money never reaches the file.
    expect(lines[2]).toBe("Birch Hollow,B,'=HYPERLINK(1),L-0002,Active,1850.00,2026-11-01,1200.50,1850.00,0.00,925.00,925.00,3050.50,Overdue,2026-10-01,,");
    expect(lines[3]).toBe("Birch Hollow,Unit 2,,L-0003,Ended,,,-75.25,0.00,0.00,0.00,0.00,-75.25,Unpaid,,2026-11-02,1850.00");
  });

  it("sums Previous balance, Charged, Paid, Rent paid, Remaining and Balance in cents on the Total line (credits included)", () => {
    expect(lines[4]).toBe("Total,,,,,,,1125.25,3700.00,1850.00,2775.00,925.00,2975.25,,,,");
  });

  it("is just the header and a zero Total line for an empty month", () => {
    expect(parse(buildMonthCsv({ month: "2026-11", summary, rows: [] }))).toEqual([MONTH_CSV_HEADER.join(","), "Total,,,,,,,0.00,0.00,0.00,0.00,0.00,0.00,,,,"]);
  });
});

describe("monthCsvFilename and shared helpers", () => {
  it("names the file after the month, plus the property without characters Windows forbids", () => {
    expect(monthCsvFilename("2026-11")).toBe("Rent roll November 2026.csv");
    expect(monthCsvFilename("2026-02", 'Birch: "North"/2')).toBe("Rent roll February 2026 - Birch North2.csv");
    expect(propertySuffix("  ")).toBe("");
  });

  it("formats cents and quotes fields", () => {
    expect(centsToCsv(-5)).toBe("-0.05");
    expect(centsToCsv(123456)).toBe("1234.56");
    expect(csvLines([["a,b", 'say "hi"']])).toBe('"a,b","say ""hi"""\r\n');
  });
});
