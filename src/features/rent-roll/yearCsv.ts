/**
 * The yearly rent roll as an Excel-friendly CSV, built on the client from the same GET /rent-roll/year response: one line
 * per unit, or per lease "By tenant" (it follows the response's rowsBy).
 * Always the whole year for the selected property (search and chips are ignored), so the API's subtotals and total match.
 */
import { csvLines, csvMoney, csvText, propertySuffix, saveCsv } from "@/features/rent-roll/rentRollCsv";
import { unitLabel } from "@/lib/labels";
import { isLeaseEnded, isUnitRow, otherLeases, renewalAlertLabels, renewalText, rowTitle, shortMonth, shownVacantMonths, tenantsWithMonths } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell, RentRollYearResponse, RentRollYearRow, RentRollYearRowsBy, RentRollYearTotals } from "@/types/rentRoll";

/** A month cell: the paid amount; empty for VACANT and OUTSIDE_LEASE (no lease that month), so column sums stay numeric. */
function cellValue(cell: RentRollYearCell): string {
  return cell.status === "VACANT" || cell.status === "OUTSIDE_LEASE" ? "" : csvMoney(cell.paid);
}

/** The fixed columns before the months: by unit with "Earlier tenants" and "Current rent"; by tenant (one lease a line) "Rent". */
const LEAD_COLUMNS: Record<RentRollYearRowsBy, string[]> = {
  unit: ["Property", "Unit", "Tenants", "Earlier tenants", "Lease number", "Current rent", "Market rent", "Lease start", "Lease end", "Deposit"],
  lease: ["Property", "Unit", "Tenants", "Lease number", "Rent", "Market rent", "Lease start", "Lease end", "Deposit"],
};
const TAIL_COLUMNS = ["Total paid", "Total charged", "Late fees", "Vacant months", "Renewal alert", "Days to lease end", "Next lease"];

/** Column headers: the fixed columns, "Jan 2026 paid" … "Dec 2026 paid", then the totals and renewal columns. */
export function yearCsvHeader(months: string[], rowsBy: RentRollYearRowsBy = "unit"): string[] {
  return [...LEAD_COLUMNS[rowsBy], ...months.map((m) => `${shortMonth(m)} ${m.slice(0, 4)} paid`), ...TAIL_COLUMNS];
}

function rowCells(row: RentRollYearRow): string[] {
  const lease = row.lease;
  const ended = isLeaseEnded(row);
  const next = row.nextLease ? `${renewalText(row.nextLease)} ${row.nextLease.leaseNumber}` : "";
  return [
    csvText(row.unit.property.name),
    csvText(unitLabel(row.unit.unitNumber)),
    csvText(lease ? lease.tenants.map((t) => t.fullName).join("; ") : rowTitle(row)),
    // By unit: "John Smith (Jan–Apr), Sarah Lee (Apr–Jun)", the unit's leases before the current one that covered months this year.
    ...(isUnitRow(row) ? [csvText(tenantsWithMonths(otherLeases(row).earlier))] : []),
    csvText(lease?.leaseNumber),
    csvMoney(lease?.rent),
    csvMoney(row.unit.monthlyRent),
    lease?.startDate ?? "",
    lease?.endDate ?? "",
    csvMoney(lease?.deposit),
    ...row.months.map(cellValue),
    csvMoney(row.totalPaid),
    csvMoney(row.totalCharged),
    csvMoney(row.lateFees),
    String(shownVacantMonths(row).length),
    row.renewalAlert ? renewalAlertLabels[row.renewalAlert] : "",
    // A number only while the lease runs; never negative (the alert column says "Ended").
    !ended && row.daysToLeaseEnd !== null && row.daysToLeaseEnd >= 0 ? String(row.daysToLeaseEnd) : "",
    csvText(next),
  ];
}

/** A subtotal or total line: label in Property, the kind in Unit, then the API's per-month paid and the year sums. */
function totalsCells(property: string, unit: string, totals: RentRollYearTotals, rowsBy: RentRollYearRowsBy): string[] {
  const blanks = LEAD_COLUMNS[rowsBy].length - 2;
  return [
    csvText(property),
    unit,
    ...Array<string>(blanks).fill(""),
    ...totals.months.map((m) => csvMoney(m.paid)),
    csvMoney(totals.totalPaid),
    csvMoney(totals.totalCharged),
    csvMoney(totals.lateFees),
    ...Array<string>(TAIL_COLUMNS.length - 3).fill(""),
  ];
}

/**
 * The CSV text (CRLF lines, no BOM: `downloadYearCsv` adds it). Rows in the API's order; after each property's rows a
 * "Subtotal" line from propertyTotals; a last "Total" line from totals. Never recomputed.
 */
export function buildYearCsv(data: RentRollYearResponse): string {
  const lines: string[][] = [yearCsvHeader(data.months, data.rowsBy)];
  const rows: RentRollYearRow[] = data.rows;
  for (const totals of data.propertyTotals) {
    for (const row of rows) if (row.unit.property.id === totals.property.id) lines.push(rowCells(row));
    lines.push(totalsCells(totals.property.name, "Subtotal", totals, data.rowsBy));
  }
  lines.push(totalsCells("Total", "", data.totals, data.rowsBy));
  return csvLines(lines);
}

/**
 * "Rent roll 2026.csv", "Rent roll 2026 by tenant.csv" (one line per lease), plus " - Birch Hollow" for one property
 * (characters Windows forbids are removed).
 */
export function yearCsvFilename(year: number, propertyName?: string | null, rowsBy: RentRollYearRowsBy = "unit"): string {
  return `Rent roll ${year}${rowsBy === "lease" ? " by tenant" : ""}${propertySuffix(propertyName)}.csv`;
}

/** Saves the CSV (UTF-8 BOM, see saveCsv). */
export function downloadYearCsv(data: RentRollYearResponse, propertyName?: string | null): void {
  saveCsv(buildYearCsv(data), yearCsvFilename(data.year, propertyName, data.rowsBy));
}
