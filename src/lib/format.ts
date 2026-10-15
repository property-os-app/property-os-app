/** Formatting rules from the PropOS guideline, section 11, adapted to our API (money as strings, dates as "YYYY-MM-DD"). */

/** Money as it comes from the API (always 2 decimals: "1200.00", "-150.00"), or a number from older callers. Other decimal counts still parse. */
export type MoneyInput = string | number | null | undefined;

/** Empty values render as a single dash, never "N/A". */
export const EMPTY = "-";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ---------- Money (all math in integer cents) ---------- */

/**
 * Parse money into integer cents with no float math: "2500.5" -> 250050, "-150.00" -> -15000, "2500" -> 250000.
 * null, undefined and "" give 0. Text that isn't a number gives NaN. A 3rd decimal rounds half up.
 */
export function toCents(value: MoneyInput): number {
  if (value === null || value === undefined) return 0;
  const text = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(2) : "") : value.trim().replace(/,/g, "");
  if (text === "") return typeof value === "number" ? NaN : 0;
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!m || (m[2] === "" && (m[3] ?? "") === "")) return NaN;
  const decimals = (m[3] ?? "").padEnd(3, "0");
  let cents = Number(m[2] || "0") * 100 + Number(decimals.slice(0, 2));
  if (Number(decimals[2]) >= 5) cents += 1;
  return m[1] === "-" && cents !== 0 ? -cents : cents;
}

/** Integer cents -> a number with max 2 decimals, for sending to the API: 250050 -> 2500.5. */
export function centsToAmount(cents: number): number {
  const abs = Math.abs(Math.round(cents));
  const text = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? -Number(text) : Number(text);
}

function isEmpty(value: MoneyInput): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/** $1,450.00 in tables and ledgers. Negative values use a minus sign (-$150.00). Empty or invalid -> "-". */
export function formatCurrency(value: MoneyInput): string {
  if (isEmpty(value)) return EMPTY;
  const cents = toCents(value);
  if (Number.isNaN(cents)) return EMPTY;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const text = `$${whole}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${text}` : text;
}

/** $128.4K / $24.6M in KPI cards and charts (display only). Empty or invalid -> "-". */
export function formatCompactCurrency(value: MoneyInput): string {
  if (isEmpty(value)) return EMPTY;
  const cents = toCents(value);
  if (Number.isNaN(cents)) return EMPTY;
  const abs = Math.abs(centsToAmount(cents));
  const sign = cents < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** 94.2% with one decimal in KPIs; pass digits=0 for badges. Accepts "94.2" too. Empty or invalid -> "-". */
export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return EMPTY;
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : EMPTY;
}

/* ---------- Dates (never new Date("YYYY-MM-DD"): it is UTC and shows the day before in US time zones) ---------- */

/** A calendar day as plain numbers (m is 1-12). No time zone. */
export type Ymd = { y: number; m: number; d: number };

/**
 * The one parser for date-only API values: exactly "YYYY-MM-DD" and a real calendar day ("2026-02-30" -> null).
 * Never throws and never goes through the browser's time zone. Anything else (timestamps, "", null) -> null.
 */
export function parseDateOnly(value: unknown): Ymd | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m) ? { y, m, d } : null;
}

/** The local calendar day of a Date (for "today" and timestamps). null when invalid. */
function localYmd(date: Date): Ymd | null {
  return Number.isNaN(date.getTime()) ? null : { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

/** A Date gives its local day; a string must be a date-only "YYYY-MM-DD". */
function toYmd(date: Date | string): Ymd | null {
  return date instanceof Date ? localYmd(date) : parseDateOnly(date);
}

/** Whole-day number for a calendar date (no time zone involved), so day differences are exact. */
function dayNumber({ y, m, d }: Ymd): number {
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const ymdLabel = (p: Ymd) => `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;

/**
 * "Nov 1, 2026" for date-only values ("YYYY-MM-DD", via parseDateOnly) or a Date (its local day).
 * Empty or invalid (including full timestamps: use formatTimestampDate) -> "-". Never throws.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (date === null || date === undefined || date === "") return EMPTY;
  const p = toYmd(date);
  return p ? ymdLabel(p) : EMPTY;
}

/** "Oct 14" (no year) for date-only values, in captions where the month is clear. Empty or invalid -> "-". */
export function formatShortDate(date: string | null | undefined): string {
  const p = parseDateOnly(date);
  return p ? `${MONTHS[p.m - 1]} ${p.d}` : EMPTY;
}

/** "Oct 12, 2026": the LOCAL day of an ISO timestamp (createdAt, updatedAt, voidedAt). Empty or invalid -> "-". */
export function formatTimestampDate(timestamp: string | null | undefined): string {
  if (!timestamp) return EMPTY;
  const p = localYmd(new Date(timestamp));
  return p ? ymdLabel(p) : EMPTY;
}

/**
 * Relative time for the last 7 days ("2h ago", "Yesterday"), otherwise formatDate.
 * Only for full timestamps (createdAt, updatedAt). Never pass "YYYY-MM-DD" values: use formatDate for those.
 */
export function formatRelative(date: Date | string, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(d);
}

/** "Expires in 23 days" / "Expired 5 days ago", with the tone the guideline prescribes. Compares calendar days. */
export function leaseCountdown(end: Date | string, now = new Date()): { label: string; tone: "neutral" | "warning" | "danger" } {
  const endDay = toYmd(end);
  const today = toYmd(now);
  if (!endDay || !today) return { label: EMPTY, tone: "neutral" };
  const days = dayNumber(endDay) - dayNumber(today);
  if (days < 0) return { label: `Expired ${Math.abs(days)} days ago`, tone: "danger" };
  if (days < 30) return { label: `Expires in ${days} days`, tone: "danger" };
  if (days < 60) return { label: `Expires in ${days} days`, tone: "warning" };
  return { label: formatDate(end), tone: "neutral" };
}

/** Today as local "YYYY-MM-DD" (not toISOString, which is UTC). */
export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Today as UTC "YYYY-MM-DD" from the UTC parts: the backend's "today" (overdue, endingSoon). */
export function todayUTC(now = new Date()): string {
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

/** Calendar days from today (local) to a "YYYY-MM-DD" date: 0 today, negative in the past. null when invalid. */
export function daysUntil(date: string | null | undefined, now = new Date()): number | null {
  if (!date) return null;
  const target = toYmd(date);
  const today = toYmd(now);
  return target && today ? dayNumber(target) - dayNumber(today) : null;
}

/** Days in a month (m is 1-12). Date.UTC is used only as a calendar, no time zone is involved. */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const ymdISO = ({ y, m, d }: Ymd) => `${y}-${pad2(m)}-${pad2(d)}`;

/**
 * "YYYY-MM-DD" plus n months (n may be negative), on year/month/day numbers. The day is clamped to the month's last day:
 * "2026-01-31" + 1 -> "2026-02-28". null when the date is invalid.
 */
export function addMonthsISO(date: string, n: number): string | null {
  const p = toYmd(date);
  if (!p) return null;
  const index = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  return ymdISO({ y, m, d: Math.min(p.d, daysInMonth(y, m)) });
}

/** "YYYY-MM-DD" plus n days (n may be negative): "2027-01-01" - 1 -> "2026-12-31". null when the date is invalid. */
export function addDaysISO(date: string, n: number): string | null {
  const p = toYmd(date);
  if (!p) return null;
  const d = new Date((dayNumber(p) + n) * 86_400_000);
  return ymdISO({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() });
}

/** This month as local "YYYY-MM", for the Rent Roll month and periodMonth. */
export function currentMonth(now = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/* ---------- Months ("YYYY-MM", no Date math) ---------- */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** True for a valid "YYYY-MM" (month 01-12), the API's month format. */
export function isMonth(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** This month as UTC "YYYY-MM": the backend's default month (rent roll, generate rent). */
export function currentMonthUTC(now = new Date()): string {
  return todayUTC(now).slice(0, 7);
}

/** "2026-10" -> "October 2026". Invalid -> "-". */
export function formatMonth(month: string): string {
  if (!isMonth(month)) return EMPTY;
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** "YYYY-MM" plus n months (n may be negative), on numbers: "2026-12" + 1 -> "2027-01". Invalid stays as it is. */
export function addMonthsYM(month: string, n: number): string {
  if (!isMonth(month)) return month;
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + n;
  const y = Math.floor(index / 12);
  return `${y}-${pad2(index - y * 12 + 1)}`;
}

/** Day `day` (1-31) of a "YYYY-MM" month, clamped to its last day: ("2026-02", 31) -> "2026-02-28". null when invalid. */
export function dayInMonth(month: string, day: number): string | null {
  if (!isMonth(month) || !Number.isInteger(day) || day < 1) return null;
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return ymdISO({ y, m, d: Math.min(day, daysInMonth(y, m)) });
}

/* ---------- Text ---------- */

/** Ordinal number: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", 22 -> "22nd", 31 -> "31st". */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Initials for avatars: "Jordan Blake" -> "JB". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
