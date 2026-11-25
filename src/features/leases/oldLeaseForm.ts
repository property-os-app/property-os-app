/**
 * Add old lease form: values, tenant rows, checks, the POST /leases/history request and where its errors go. Rules from
 * rules.md (History-only lease) and API.md (POST /leases/history). No API import, so it is unit-testable.
 */
import { addDaysISO, centsToAmount, parseDateOnly, todayUTC, toCents } from "@/lib/format";
import { MAX_TAGS } from "@/features/leases/stats";
import { EMAIL_MESSAGE, isEmailOrEmpty } from "@/features/tenants/form";
import type { LeaseHistoryBody, NewLeaseTenant } from "@/types/lease";

/** A tenant who exists already; the name and contact are only shown. */
export interface ExistingTenantRow {
  kind: "existing";
  key: string;
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}

/** A tenant created together with the lease. */
export interface NewTenantRow {
  kind: "new";
  key: string;
  fullName: string;
  email: string;
  phone: string;
}

export type OldLeaseTenant = ExistingTenantRow | NewTenantRow;

export interface OldLeaseValues {
  /** Only filters the unit list; never sent. */
  propertyId: string;
  unitId: string;
  tenants: OldLeaseTenant[];
  /** `key` of the primary tenant's row; "" = not chosen. */
  primaryKey: string;
  /** "" or "YYYY-MM-DD" (input type="date"). */
  startDate: string;
  endDate: string;
  rent: number | "";
  deposit: number | "";
  notes: string;
  tags: string[];
}

/** The errors of one new tenant's row. `existing`: the tenant who already has this email (409 TENANT_EMAIL_EXISTS). */
export interface NewTenantErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  existing?: { id: string; fullName: string };
}

export type OldLeaseField = "unitId" | "tenants" | "startDate" | "endDate" | "rent" | "deposit" | "notes" | "tags" | "file";
export type OldLeaseErrors = Partial<Record<OldLeaseField, string>> & {
  /** By row key. */
  newTenants?: Record<string, NewTenantErrors>;
};

/** Existing and new tenants together. */
export const MAX_OLD_LEASE_TENANTS = 10;

/** rent and deposit: 0 to 9,999,999,999.99 (as on POST /leases). */
const MAX_MONEY_CENTS = 999_999_999_999;

export function emptyOldLease(preset: { propertyId?: string; unitId?: string } = {}): OldLeaseValues {
  return {
    propertyId: preset.propertyId ?? "",
    unitId: preset.unitId ?? "",
    tenants: [],
    primaryKey: "",
    startDate: "",
    endDate: "",
    rent: "",
    deposit: "",
    notes: "",
    tags: [],
  };
}

/* ---------- Tenant rows (exactly one primary) ---------- */

type TenantPart = Pick<OldLeaseValues, "tenants" | "primaryKey">;

/** A single tenant is always the primary one; a primary that is gone is cleared, so the user chooses. */
function withPrimary(tenants: OldLeaseTenant[], primaryKey: string): TenantPart {
  if (tenants.length === 1) return { tenants, primaryKey: tenants[0].key };
  return { tenants, primaryKey: tenants.some((t) => t.key === primaryKey) ? primaryKey : "" };
}

/** Adds an existing tenant; one who is listed already changes nothing. */
export function addExistingTenant(v: TenantPart, t: Omit<ExistingTenantRow, "kind" | "key">): TenantPart {
  if (v.tenants.some((row) => row.kind === "existing" && row.id === t.id)) return { tenants: v.tenants, primaryKey: v.primaryKey };
  return withPrimary([...v.tenants, { ...t, kind: "existing", key: `tenant-${t.id}` }], v.primaryKey);
}

/** Adds an empty new tenant. `n` makes its key unique. */
export function addNewTenant(v: TenantPart, n: number): TenantPart {
  return withPrimary([...v.tenants, { kind: "new", key: `new-${n}`, fullName: "", email: "", phone: "" }], v.primaryKey);
}

export function removeTenant(v: TenantPart, key: string): TenantPart {
  return withPrimary(
    v.tenants.filter((t) => t.key !== key),
    v.primaryKey,
  );
}

/**
 * "Use existing tenant": the new tenant's row becomes the existing tenant and keeps Primary. When that tenant is listed
 * already, the new row is dropped and the listed one takes its Primary.
 */
export function swapForExisting(v: TenantPart, key: string, t: Omit<ExistingTenantRow, "kind" | "key">): TenantPart {
  const listed = v.tenants.find((row) => row.kind === "existing" && row.id === t.id);
  const row: ExistingTenantRow = { ...t, kind: "existing", key: `tenant-${t.id}` };
  const tenants = listed ? v.tenants.filter((x) => x.key !== key) : v.tenants.map((x) => (x.key === key ? row : x));
  return withPrimary(tenants, v.primaryKey === key ? (listed ?? row).key : v.primaryKey);
}

const newRows = (tenants: OldLeaseTenant[]) => tenants.filter((t) => t.kind === "new");
const emailKey = (email: string) => email.trim().toLowerCase();

/* ---------- Checks ---------- */

/** The last day an old lease may end: the day before UTC today (the backend's today). Also the end date input's `max`. */
export function lastOldLeaseEnd(today = todayUTC()): string {
  return addDaysISO(today, -1) ?? today;
}

/** Errors per new row: a name, a valid email when filled, and no email twice (under the later row). */
function newTenantErrors(tenants: OldLeaseTenant[]): Record<string, NewTenantErrors> {
  const found: Record<string, NewTenantErrors> = {};
  const seen = new Set<string>();
  for (const t of newRows(tenants)) {
    const errors: NewTenantErrors = {};
    const email = emailKey(t.email);
    if (!t.fullName.trim()) errors.fullName = "Enter the full name.";
    if (!isEmailOrEmpty(email)) errors.email = EMAIL_MESSAGE;
    else if (email && seen.has(email)) errors.email = "Another new tenant has this email.";
    if (email) seen.add(email);
    if (Object.keys(errors).length > 0) found[t.key] = errors;
  }
  return found;
}

/** The form's checks, like the backend's: unit, both dates, at least one tenant and exactly one primary; start before end; end before today. */
export function validateOldLease(v: OldLeaseValues, today = todayUTC()): OldLeaseErrors {
  const errors: OldLeaseErrors = {};
  if (!v.unitId) errors.unitId = "Choose a unit.";
  if (v.tenants.length === 0) errors.tenants = "Add at least one tenant.";
  else if (v.tenants.length > MAX_OLD_LEASE_TENANTS) errors.tenants = `A lease can have at most ${MAX_OLD_LEASE_TENANTS} tenants.`;
  else if (!v.tenants.some((t) => t.key === v.primaryKey)) errors.tenants = "Choose the primary tenant.";
  const rows = newTenantErrors(v.tenants);
  if (Object.keys(rows).length > 0) errors.newTenants = rows;
  if (!v.startDate) errors.startDate = "Enter the start date.";
  else if (!parseDateOnly(v.startDate)) errors.startDate = "Use a full date.";
  if (!v.endDate) errors.endDate = "Enter the end date.";
  else if (!parseDateOnly(v.endDate)) errors.endDate = "Use a full date.";
  else if (v.endDate >= today) errors.endDate = "An old lease must end before today.";
  else if (parseDateOnly(v.startDate) && v.endDate <= v.startDate) errors.endDate = "The end date must be after the start date.";
  if (v.rent !== "" && toCents(v.rent) > MAX_MONEY_CENTS) errors.rent = "Rent can be at most $9,999,999,999.99.";
  if (v.deposit !== "" && toCents(v.deposit) > MAX_MONEY_CENTS) errors.deposit = "Deposit can be at most $9,999,999,999.99.";
  if (v.tags.length > MAX_TAGS) errors.tags = `A lease can have at most ${MAX_TAGS} tags.`;
  return errors;
}

/* ---------- Request ---------- */

function newTenantBody(t: NewTenantRow, isPrimary: boolean): NewLeaseTenant {
  const email = t.email.trim();
  const phone = t.phone.trim();
  return { fullName: t.fullName.trim(), ...(email ? { email } : {}), ...(phone ? { phone } : {}), ...(isPrimary ? { isPrimary: true } : {}) };
}

/**
 * The JSON of POST /leases/history: required fields, plus the optional ones only when filled (money as numbers, notes
 * trimmed). The primary is `primaryTenantId` or one new tenant's `isPrimary`, never both.
 */
export function oldLeaseBody(v: OldLeaseValues): LeaseHistoryBody {
  const body: LeaseHistoryBody = { unitId: v.unitId, startDate: v.startDate, endDate: v.endDate };
  const existing = v.tenants.filter((t) => t.kind === "existing");
  const primary = existing.find((t) => t.key === v.primaryKey);
  const coIds = existing.filter((t) => t !== primary).map((t) => t.id);
  const created = newRows(v.tenants).map((t) => newTenantBody(t, t.key === v.primaryKey));
  if (primary) body.primaryTenantId = primary.id;
  if (coIds.length > 0) body.coTenantIds = coIds;
  if (created.length > 0) body.newTenants = created;
  if (v.rent !== "") body.rent = centsToAmount(toCents(v.rent));
  if (v.deposit !== "") body.deposit = centsToAmount(toCents(v.deposit));
  const notes = v.notes.trim();
  if (notes) body.notes = notes;
  if (v.tags.length > 0) body.tags = v.tags;
  return body;
}

/** The multipart body: `data` (the JSON as text) and the optional signed lease in `file`. Any other field is 400. */
export function oldLeaseRequest(body: LeaseHistoryBody, file: File | null): FormData {
  const form = new FormData();
  form.append("data", JSON.stringify(body));
  if (file) form.append("file", file, file.name);
  return form;
}

/* ---------- Backend errors ---------- */

/** The field a backend message belongs under, or null for the top of the form. Dates (400 end date, 409 overlap) go under End date. */
export function oldLeaseErrorField(message: string): OldLeaseField | null {
  if (message.startsWith("endDate") || message.startsWith("Unit already has a lease")) return "endDate";
  if (message.startsWith("startDate")) return "startDate";
  if (/^(Tenant|primaryTenantId|coTenantIds|newTenants|each value in coTenantIds|At least one tenant|Exactly one tenant)/.test(message)) return "tenants";
  if (message.startsWith("file ") || message.startsWith("File too large")) return "file";
  if (message.startsWith("rent ")) return "rent";
  if (message.startsWith("deposit")) return "deposit";
  if (message.startsWith("tags") || message.startsWith("each value in tags")) return "tags";
  if (message.startsWith("notes ")) return "notes";
  if (message.startsWith("unitId")) return "unitId";
  return null;
}

/** What this needs of an ApiError. `details` is the error body. */
export interface OldLeaseServerError {
  status: number;
  code?: string;
  messages: string[];
  details?: unknown;
}

/** The tenant and row of a 409 TENANT_EMAIL_EXISTS; null for any other error. */
function emailExists(err: OldLeaseServerError): { tenant: { id: string; fullName: string }; index: number } | null {
  if (err.code !== "TENANT_EMAIL_EXISTS" || typeof err.details !== "object" || err.details === null) return null;
  const { tenant, newTenantIndex } = err.details as { tenant?: { id?: unknown; fullName?: unknown } | null; newTenantIndex?: unknown };
  if (typeof newTenantIndex !== "number" || typeof tenant?.id !== "string" || typeof tenant.fullName !== "string") return null;
  return { tenant: { id: tenant.id, fullName: tenant.fullName }, index: newTenantIndex };
}

const ROW_FIELD = { fullName: "Full name", email: "Email", phone: "Phone" } as const;

/** Where a failed save's messages go: under their field, under a new tenant's row, or `top`. Rows are in the order they were sent. */
export function oldLeaseServerErrors(err: OldLeaseServerError, tenants: OldLeaseTenant[]): { errors: OldLeaseErrors; top: string } {
  const rows = newRows(tenants);
  const byRow: Record<string, NewTenantErrors> = {};
  const errors: OldLeaseErrors = {};
  const top: string[] = [];

  const exists = emailExists(err);
  if (exists && rows[exists.index]) {
    return { errors: { newTenants: { [rows[exists.index].key]: { email: `${exists.tenant.fullName} already has this email.`, existing: exists.tenant } } }, top: "" };
  }

  for (const message of err.messages) {
    const onRow = /^newTenants\.(\d+)\.(fullName|email|phone)\b\s*(.*)$/.exec(message);
    const row = onRow ? rows[Number(onRow[1])] : undefined;
    const twice = /^newTenants has the same email twice: (.+?)\.?$/.exec(message);
    const twiceRow = twice ? rows.filter((r) => emailKey(r.email) === emailKey(twice[1])).at(-1) : undefined;
    if (onRow && row) {
      const field = onRow[2] as keyof typeof ROW_FIELD;
      const text = field === "email" && onRow[3] === "must be an email" ? EMAIL_MESSAGE : `${ROW_FIELD[field]} ${onRow[3]}`;
      byRow[row.key] = { ...byRow[row.key], [field]: [byRow[row.key]?.[field], text].filter(Boolean).join(" ") };
    } else if (twiceRow) {
      byRow[twiceRow.key] = { ...byRow[twiceRow.key], email: "Another new tenant has this email." };
    } else if (err.status === 413) {
      errors.file = "File too large (max 20 MB).";
    } else {
      const field = oldLeaseErrorField(message);
      if (field) errors[field] = [errors[field], message].filter(Boolean).join(" ");
      else top.push(message);
    }
  }
  if (Object.keys(byRow).length > 0) errors.newTenants = byRow;
  return { errors, top: top.join(" ") };
}
