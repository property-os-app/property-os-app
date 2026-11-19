/**
 * The yearly rent roll as an Excel-friendly CSV, built on the client from the same GET /rent-roll/year response.
 * Always the whole year for the selected property (search and chips are ignored), so the API's subtotals and total match.
 */
import { toCents } from "@/lib/format";
import { saveBlob } from "@/lib/pdf";
import { isLeaseEnded, renewalAlertLabels, renewalText, rowTitle, shortMonth, shownVacantMonths } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell, RentRollYearResponse, RentRollYearRow, RentRollYearTotals } from "@/types/rentRoll";

/** Money as a plain number with 2 decimals ("3400.00", "-150.00"): no $, no commas, no float math. Empty stays empty. */
export function csvMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") return "";
  const cents = toCents(value);
  if (Number.isNaN(cents)) return "";
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Text that a spreadsheet would run as a formula (=, +, -, @, tab, CR) gets a leading apostrophe. Money never goes through this. */
export function csvText(value: string | null | undefined): string {
  const text = value ?? "";
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Quotes a field when it holds a comma, quote or line break (quotes doubled). */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** A month cell: the paid amount; empty for VACANT and OUTSIDE_LEASE (no lease that month), so column sums stay numeric. */
function cellValue(cell: RentRollYearCell): string {
  return cell.status === "VACANT" || cell.status === "OUTSIDE_LEASE" ? "" : csvMoney(cell.paid);
}

const LEAD_COLUMNS = ["Property", "Unit", "Tenants", "Lease number", "Current rent", "Market rent", "Lease start", "Lease end", "Deposit"];
const TAIL_COLUMNS = ["Total paid", "Total charged", "Late fees", "Vacant months", "Renewal alert", "Days to lease end", "Next lease"];

/** Column headers: the fixed columns, "Jan 2026 paid" … "Dec 2026 paid", then the totals and renewal columns. */
export function yearCsvHeader(months: string[]): string[] {
  return [...LEAD_COLUMNS, ...months.map((m) => `${shortMonth(m)} ${m.slice(0, 4)} paid`), ...TAIL_COLUMNS];
}

function rowCells(row: RentRollYearRow): string[] {
  const lease = row.lease;
  const ended = isLeaseEnded(row);
  const next = row.nextLease ? `${renewalText(row.nextLease)} ${row.nextLease.leaseNumber}` : "";
  return [
    csvText(row.unit.property.name),
    csvText(row.unit.unitNumber),
    csvText(lease ? lease.tenants.map((t) => t.fullName).join("; ") : rowTitle(row)),
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
function totalsCells(property: string, unit: string, totals: RentRollYearTotals): string[] {
  const blanks = LEAD_COLUMNS.length - 2;
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
  const lines: string[][] = [yearCsvHeader(data.months)];
  for (const totals of data.propertyTotals) {
    for (const row of data.rows) if (row.unit.property.id === totals.property.id) lines.push(rowCells(row));
    lines.push(totalsCells(totals.property.name, "Subtotal", totals));
  }
  lines.push(totalsCells("Total", "", data.totals));
  return lines.map((cells) => cells.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** "Rent roll 2026.csv", or "Rent roll 2026 - Birch Hollow.csv" for one property (characters Windows forbids are removed). */
export function yearCsvFilename(year: number, propertyName?: string | null): string {
  const name = propertyName?.replace(/[\\/:*?"<>|]/g, "").trim();
  return name ? `Rent roll ${year} - ${name}.csv` : `Rent roll ${year}.csv`;
}

/** Saves the CSV with a UTF-8 BOM, so Excel reads accents and the "·" correctly. */
export function downloadYearCsv(data: RentRollYearResponse, propertyName?: string | null): void {
  const blob = new Blob(["﻿", buildYearCsv(data)], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, yearCsvFilename(data.year, propertyName));
}

