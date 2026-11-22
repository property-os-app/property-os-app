/**
 * Add old lease form: values, checks and the POST /leases/history body. Rules from rules.md (History-only lease) and
 * API.md (POST /leases/history). No API import, so it is unit-testable.
 */
import { addDaysISO, centsToAmount, parseDateOnly, todayUTC, toCents } from "@/lib/format";
import { MAX_TAGS } from "@/features/leases/stats";
import type { LeaseHistoryBody } from "@/types/lease";

export interface OldLeaseValues {
  /** Only filters the unit list; never sent. */
  propertyId: string;
  unitId: string;
  primaryTenantId: string;
  coTenantIds: string[];
  /** "" or "YYYY-MM-DD" (input type="date"). */
  startDate: string;
  endDate: string;
  rent: number | "";
  deposit: number | "";
  notes: string;
  tags: string[];
}

export type OldLeaseField = Exclude<keyof OldLeaseValues, "propertyId">;
export type OldLeaseErrors = Partial<Record<OldLeaseField, string>>;

/** rent and deposit: 0 to 9,999,999,999.99 (as on POST /leases). */
const MAX_MONEY_CENTS = 999_999_999_999;

export function emptyOldLease(preset: { propertyId?: string; unitId?: string } = {}): OldLeaseValues {
  return {
    propertyId: preset.propertyId ?? "",
    unitId: preset.unitId ?? "",
    primaryTenantId: "",
    coTenantIds: [],
    startDate: "",
    endDate: "",
    rent: "",
    deposit: "",
    notes: "",
    tags: [],
  };
}

/** The last day an old lease may end: the day before UTC today (the backend's today). Also the end date input's `max`. */
export function lastOldLeaseEnd(today = todayUTC()): string {
  return addDaysISO(today, -1) ?? today;
}

/** The form's checks, like the backend's: unit, primary tenant and both dates required; start before end; end before today. */
export function validateOldLease(v: OldLeaseValues, today = todayUTC()): OldLeaseErrors {
  const errors: OldLeaseErrors = {};
  if (!v.unitId) errors.unitId = "Choose a unit.";
  if (!v.primaryTenantId) errors.primaryTenantId = "Choose the primary tenant.";
  if (v.coTenantIds.includes(v.primaryTenantId)) errors.coTenantIds = "The primary tenant can't also be a co-tenant.";
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

/** POST /leases/history body: required fields, plus the optional ones only when filled (money as numbers, notes trimmed). */
export function oldLeaseBody(v: OldLeaseValues): LeaseHistoryBody {
  const body: LeaseHistoryBody = { unitId: v.unitId, primaryTenantId: v.primaryTenantId, startDate: v.startDate, endDate: v.endDate };
  if (v.coTenantIds.length > 0) body.coTenantIds = v.coTenantIds;
  if (v.rent !== "") body.rent = centsToAmount(toCents(v.rent));
  if (v.deposit !== "") body.deposit = centsToAmount(toCents(v.deposit));
  const notes = v.notes.trim();
  if (notes) body.notes = notes;
  if (v.tags.length > 0) body.tags = v.tags;
  return body;
}

/**
 * The field a backend message belongs under, or null for the top of the form. Dates (400 end date, 409 overlap) go under
 * End date; tenant messages under Primary tenant; the field-named validation messages under that field.
 */
export function oldLeaseErrorField(message: string): OldLeaseField | null {
  if (message.startsWith("endDate") || message.startsWith("Unit already has a lease")) return "endDate";
  if (message.startsWith("startDate")) return "startDate";
  if (message.startsWith("Tenant") || message.startsWith("primaryTenantId")) return "primaryTenantId";
  if (message.startsWith("coTenantIds")) return "coTenantIds";
  if (message.startsWith("rent ")) return "rent";
  if (message.startsWith("deposit")) return "deposit";
  if (message.startsWith("tags") || message.startsWith("each value in tags")) return "tags";
  if (message.startsWith("unitId")) return "unitId";
  return null;
}
