/**
 * The monthly rent roll as an Excel-friendly CSV, built on the client from the GET /rent-roll response the page already
 * loaded: one line per lease, in the API's order, then a "Total" line. Always the whole month for the selected property
 * (search, status and sort are ignored), like the yearly CSV. Same rules: BOM, formula guard, money as plain numbers.
 */
import { formatMonth } from "@/lib/format";
import { leaseStatusLabels, rentStatusLabels, unitLabel } from "@/lib/labels";
import { centsToCsv, csvLines, csvMoney, csvText, propertySuffix, saveCsv } from "@/features/rent-roll/rentRollCsv";
import { rowTotals } from "@/features/rent-roll/stats";
import type { RentRollResponse, RentRollRow } from "@/types/rentRoll";

export const MONTH_CSV_HEADER = [
  "Property",
  "Unit",
  "Tenant",
  "Lease number",
  "Lease status",
  "Rent",
  "Due date",
  "Previous balance",
  "Charged",
  "Paid",
  "Balance",
  "Status",
  "Oldest unpaid due date",
  "Last payment",
  "Deposit held",
];

function rowCells(r: RentRollRow): string[] {
  return [
    csvText(r.unit.property.name),
    csvText(unitLabel(r.unit.unitNumber)),
    // The monthly rows carry the primary tenant only.
    csvText(r.primaryTenant?.fullName),
    csvText(r.leaseNumber),
    leaseStatusLabels[r.leaseStatus],
    csvMoney(r.rent),
    r.dueDate ?? "",
    csvMoney(r.openingBalance),
    csvMoney(r.charged),
    csvMoney(r.paid),
    csvMoney(r.balance),
    rentStatusLabels[r.status],
    r.oldestUnpaidDueDate ?? "",
    r.lastPaymentDate ?? "",
    csvMoney(r.depositHeld),
  ];
}

/**
 * The CSV text (CRLF lines, no BOM: `downloadMonthCsv` adds it). The Total line sums Previous balance, Charged, Paid and
 * Balance in integer cents over every row (like the table's Totals row; the API's summary has no per-column totals).
 */
export function buildMonthCsv(data: RentRollResponse): string {
  const t = rowTotals(data.rows);
  const total = ["Total", "", "", "", "", "", "", centsToCsv(t.openingCents), centsToCsv(t.chargedCents), centsToCsv(t.paidCents), centsToCsv(t.owedCents - t.creditCents), "", "", "", ""];
  return csvLines([MONTH_CSV_HEADER, ...data.rows.map(rowCells), total]);
}

/** "Rent roll November 2026.csv", plus " - Birch Hollow" for one property. */
export function monthCsvFilename(month: string, propertyName?: string | null): string {
  return `Rent roll ${formatMonth(month)}${propertySuffix(propertyName)}.csv`;
}

/** Saves the CSV (UTF-8 BOM, see saveCsv). */
export function downloadMonthCsv(data: RentRollResponse, propertyName?: string | null): void {
  saveCsv(buildMonthCsv(data), monthCsvFilename(data.month, propertyName));
}
