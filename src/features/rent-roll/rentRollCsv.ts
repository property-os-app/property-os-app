/**
 * Shared rules for the Rent Roll CSV exports (month and year): money as plain numbers, a formula guard for text, quoting,
 * and saving with a UTF-8 BOM so Excel reads accents correctly.
 */
import { toCents } from "@/lib/format";
import { saveBlob } from "@/lib/pdf";

/** Money as a plain number with 2 decimals ("3400.00", "-150.00"): no $, no commas, no float math. Empty stays empty. */
export function csvMoney(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") return "";
  const cents = toCents(value);
  if (Number.isNaN(cents)) return "";
  return centsToCsv(cents);
}

/** Integer cents as a plain number with 2 decimals (for client-side sums, done in cents). */
export function centsToCsv(cents: number): string {
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

/** Lines of cells as CSV text: fields quoted when needed, CRLF line ends (the last line too). */
export function csvLines(lines: string[][]): string {
  return lines.map((cells) => cells.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** " - Birch Hollow" for one property (characters Windows forbids removed), else "". */
export function propertySuffix(propertyName?: string | null): string {
  const name = propertyName?.replace(/[\\/:*?"<>|]/g, "").trim();
  return name ? ` - ${name}` : "";
}

/** Saves CSV text with a UTF-8 BOM, so Excel reads accents and the "·" correctly. */
export function saveCsv(csv: string, filename: string): void {
  saveBlob(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), filename);
}
