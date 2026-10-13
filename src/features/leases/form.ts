/**
 * Add / Edit Lease wizard: form schema, defaults, request bodies and server-error routing.
 * Rules from docs/rules.md (Leases) and docs/API.md (POST / PATCH /leases).
 */
import type { FieldErrors } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { centsToAmount, toCents } from "@/lib/format";
import { paymentFrequencyLabels, signatureStatusLabels } from "@/lib/labels";
import { MAX_TAGS, coTenants, isClosed, missingToActivate, parseMissingMessage, primaryTenant } from "@/features/leases/stats";
import type { Lease, LeaseCreateBody, LeaseUpdateBody, PaymentFrequency, SignatureStatus } from "@/types/lease";
import type { Unit } from "@/types/unit";

export const STEPS = ["Parties", "Terms", "Deposit", "Review"] as const;

const FREQUENCIES = Object.keys(paymentFrequencyLabels) as [PaymentFrequency, ...PaymentFrequency[]];
const SIGNATURES = Object.keys(signatureStatusLabels) as [SignatureStatus, ...SignatureStatus[]];

/** rent, deposit, lateFeeAmount: 0 to 9,999,999,999.99. */
const MAX_MONEY_CENTS = 999_999_999_999;

const money = (label: string) =>
  z.union([z.number(), z.literal("")]).refine((v) => v === "" || toCents(v) <= MAX_MONEY_CENTS, `${label} can be at most $9,999,999,999.99.`);

// Input type="date" gives "" or "YYYY-MM-DD".
const date = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a full date.");

/** Format rules only. Activation rules (required fields) are checked by missingToActivate. */
export const schema = z
  .object({
    /** Only filters the unit list; never sent. */
    propertyId: z.string(),
    unitId: z.string().min(1, "Choose a unit."),
    primaryTenantId: z.string(),
    coTenantIds: z.array(z.string()),
    startDate: date,
    endDate: date,
    rent: money("Monthly rent"),
    paymentFrequency: z.enum(FREQUENCIES),
    rentDueDay: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31), "Use a day from 1 to 31.")
      .transform((v) => (v === "" ? null : Number(v))),
    lateFeeAmount: money("Late fee"),
    lateFeeGraceDays: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v), "Use a whole number, 0 or more.")
      .transform(Number),
    autoRenew: z.boolean(),
    deposit: money("Security deposit"),
    tags: z.array(z.string()).max(MAX_TAGS, `A lease can have at most ${MAX_TAGS} tags.`),
    signatureStatus: z.enum(SIGNATURES),
    notes: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    // The backend checks this only at activation; the form checks it for drafts too (docs/rules.md).
    if (v.startDate && v.endDate && v.endDate <= v.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date." });
    }
  });

export type FormInput = z.input<typeof schema>;
export type FormOutput = z.output<typeof schema>;
export type FieldName = keyof FormInput;

/** The fields each step shows (Continue validates only these). */
export const STEP_FIELDS: FieldName[][] = [
  ["propertyId", "unitId", "primaryTenantId", "coTenantIds"],
  ["startDate", "endDate", "rent", "paymentFrequency", "rentDueDay", "lateFeeAmount", "lateFeeGraceDays", "autoRenew"],
  ["deposit", "tags", "signatureStatus", "notes"],
  [],
];

/** Backend field names (same as the form's) for applyServerError. */
export const SERVER_FIELDS = [
  "unitId",
  "primaryTenantId",
  "coTenantIds",
  "startDate",
  "endDate",
  "rent",
  "paymentFrequency",
  "rentDueDay",
  "lateFeeAmount",
  "lateFeeGraceDays",
  "autoRenew",
  "deposit",
  "tags",
  "signatureStatus",
  "notes",
] as const satisfies readonly FieldName[];

export function stepOf(field: string): number {
  const i = STEP_FIELDS.findIndex((fields) => fields.includes(field as FieldName));
  return i === -1 ? 0 : i;
}

/** First step that has a validation error (handleSubmit's onInvalid). */
export function firstErrorStep(errors: FieldErrors<FormInput>): number {
  const steps = Object.keys(errors).map(stepOf);
  return steps.length > 0 ? Math.min(...steps) : 0;
}

/** API money string -> CurrencyInput value. */
function moneyValue(value: string | null | undefined): number | "" {
  return value === null || value === undefined || value === "" ? "" : centsToAmount(toCents(value));
}

export interface WizardPresets {
  /** Edit this lease. */
  lease?: Lease;
  /** Create: preset unit (unit drawer). Also prefills the rent. */
  unit?: Unit;
  /** Create: preset property (the sidebar scope). */
  propertyId?: string | null;
  /** Create: preset primary tenant (tenant drawer). */
  tenantId?: string;
}

export function defaults({ lease, unit, propertyId, tenantId }: WizardPresets): FormInput {
  if (lease) {
    return {
      propertyId: lease.unit.property.id,
      unitId: lease.unitId,
      primaryTenantId: primaryTenant(lease)?.id ?? "",
      coTenantIds: coTenants(lease).map((t) => t.id),
      startDate: lease.startDate ?? "",
      endDate: lease.endDate ?? "",
      rent: moneyValue(lease.rent),
      paymentFrequency: lease.paymentFrequency,
      rentDueDay: lease.rentDueDay !== null ? String(lease.rentDueDay) : "",
      lateFeeAmount: moneyValue(lease.lateFeeAmount),
      lateFeeGraceDays: String(lease.lateFeeGraceDays),
      autoRenew: lease.autoRenew,
      deposit: moneyValue(lease.deposit),
      tags: lease.tags,
      signatureStatus: lease.signatureStatus,
      notes: lease.notes ?? "",
    };
  }
  return {
    propertyId: unit?.propertyId ?? propertyId ?? "",
    unitId: unit?.id ?? "",
    primaryTenantId: tenantId ?? "",
    coTenantIds: [],
    startDate: "",
    endDate: "",
    rent: moneyValue(unit?.monthlyRent),
    // Only MONTHLY for now (only MONTHLY leases get rent from "Generate rent").
    paymentFrequency: "MONTHLY",
    rentDueDay: "1",
    lateFeeAmount: 0,
    lateFeeGraceDays: "5",
    autoRenew: false,
    deposit: "",
    tags: [],
    signatureStatus: "NOT_SENT",
    notes: "",
  };
}

/** What the form still misses to activate (friendly names). Works on raw form values. */
export function formMissing(v: FormInput): string[] {
  return missingToActivate({
    primaryTenantId: v.primaryTenantId,
    startDate: v.startDate,
    endDate: v.endDate,
    rent: v.rent,
    deposit: v.deposit,
    rentDueDay: v.rentDueDay.trim(),
  });
}

/** POST /leases body. Empty optional fields are left out (never null on create). `activate` sends status "ACTIVE". */
export function createBody(v: FormOutput, activate: boolean): LeaseCreateBody {
  return {
    unitId: v.unitId,
    ...(activate ? { status: "ACTIVE" as const } : {}),
    signatureStatus: v.signatureStatus,
    paymentFrequency: v.paymentFrequency,
    lateFeeAmount: v.lateFeeAmount === "" ? 0 : v.lateFeeAmount,
    lateFeeGraceDays: v.lateFeeGraceDays,
    autoRenew: v.autoRenew,
    tags: v.tags,
    ...(v.primaryTenantId ? { primaryTenantId: v.primaryTenantId } : {}),
    ...(v.coTenantIds.length > 0 ? { coTenantIds: v.coTenantIds } : {}),
    ...(v.startDate ? { startDate: v.startDate } : {}),
    ...(v.endDate ? { endDate: v.endDate } : {}),
    ...(v.rent !== "" ? { rent: v.rent } : {}),
    ...(v.deposit !== "" ? { deposit: v.deposit } : {}),
    ...(v.rentDueDay !== null ? { rentDueDay: v.rentDueDay } : {}),
    ...(v.notes ? { notes: v.notes } : {}),
  };
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));

/**
 * PATCH /leases/:id body with only the changed fields. Never status.
 * ENDED / TERMINATED: only tags and notes. ACTIVE: never unitId, never null for dates, rent, deposit, rentDueDay
 * or the primary tenant. DRAFT: everything, cleared fields become null. Tenants only when they changed.
 */
export function updateBody(v: FormOutput, lease: Lease): LeaseUpdateBody {
  const body: LeaseUpdateBody = {};
  if (v.tags.join("\n") !== lease.tags.join("\n")) body.tags = v.tags;
  if (v.notes !== (lease.notes ?? "")) body.notes = v.notes || null;
  if (isClosed(lease)) return body;

  const draft = lease.status === "DRAFT";
  // A cleared value is sent as null only on a DRAFT; on an ACTIVE lease it is left out (Save is blocked anyway).
  const clearable = <T>(next: T | null, before: T | null, set: (value: T | null) => void) => {
    if (next === before) return;
    if (next !== null) set(next);
    else if (draft) set(null);
  };

  if (draft && v.unitId !== lease.unitId) body.unitId = v.unitId;

  clearable(v.primaryTenantId || null, primaryTenant(lease)?.id ?? null, (x) => (body.primaryTenantId = x));
  if (!sameIds(v.coTenantIds, coTenants(lease).map((t) => t.id))) body.coTenantIds = v.coTenantIds;

  clearable(v.startDate || null, lease.startDate, (x) => (body.startDate = x));
  clearable(v.endDate || null, lease.endDate, (x) => (body.endDate = x));
  const rent = v.rent === "" ? null : toCents(v.rent);
  clearable(rent, lease.rent === null ? null : toCents(lease.rent), () => (body.rent = v.rent === "" ? null : v.rent));
  const deposit = v.deposit === "" ? null : toCents(v.deposit);
  clearable(deposit, lease.deposit === null ? null : toCents(lease.deposit), () => (body.deposit = v.deposit === "" ? null : v.deposit));
  clearable(v.rentDueDay, lease.rentDueDay, (x) => (body.rentDueDay = x));

  const lateFee = v.lateFeeAmount === "" ? 0 : v.lateFeeAmount;
  if (toCents(lateFee) !== toCents(lease.lateFeeAmount)) body.lateFeeAmount = lateFee;
  if (v.lateFeeGraceDays !== lease.lateFeeGraceDays) body.lateFeeGraceDays = v.lateFeeGraceDays;
  if (v.autoRenew !== lease.autoRenew) body.autoRenew = v.autoRenew;
  if (v.paymentFrequency !== lease.paymentFrequency) body.paymentFrequency = v.paymentFrequency;
  if (v.signatureStatus !== lease.signatureStatus) body.signatureStatus = v.signatureStatus;
  return body;
}

/** "Cannot activate lease: missing rent, deposit" -> "Missing to activate: Monthly rent, Security deposit". Other messages unchanged. */
export function friendlyServerMessage(message: string): string {
  const missing = parseMissingMessage(message);
  return missing ? `Missing to activate: ${missing.join(", ")}.` : message;
}

/**
 * The step to show after a server error: a field message jumps to its field's step, an overlap (409) to Terms,
 * a missing-fields message to Review, tenant / unit messages to Parties. Otherwise stay on `current`.
 */
export function serverErrorStep(err: unknown, current: number): number {
  if (!(err instanceof ApiError)) return current;
  for (const m of err.messages) {
    const field = SERVER_FIELDS.find((f) => m === f || m.startsWith(`${f} `));
    if (field) return stepOf(field);
    if (m.includes("overlapping")) return 1;
    if (parseMissingMessage(m)) return 3;
    if (/^(Tenant|Unit)/.test(m) || m.includes("access to this property")) return 0;
  }
  return current;
}
