/** The Add / Edit vendor form: schema, defaults and request bodies (rules.md "Vendors"). */
import { z } from "zod";
import { centsToAmount, toCents } from "@/lib/format";
import { rateUnitLabels } from "@/lib/labels";
import type { Vendor, VendorCreateBody, VendorRateUnit, VendorUpdateBody } from "@/types/vendor";

const RATE_UNITS = Object.keys(rateUnitLabels) as [VendorRateUnit, ...VendorRateUnit[]];
/** rateAmount: 0.01 to 9,999,999,999.99. */
const MAX_AMOUNT_CENTS = 999_999_999_999;

const short = (label: string) => z.string().trim().max(200, `Keep the ${label} under 200 characters.`);

export const vendorSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the vendor name.").max(100, "Keep the name under 100 characters."),
    trade: z.string().min(1, "Choose a trade."),
    contactName: short("contact name"),
    phone: short("phone"),
    email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email, e.g. name@example.com."),
    serviceArea: short("service area"),
    rateAmount: z
      .union([z.number(), z.literal("")])
      .refine((v) => v === "" || toCents(v) > 0, "Enter a rate greater than $0.")
      .refine((v) => v === "" || toCents(v) <= MAX_AMOUNT_CENTS, "The rate can be at most $9,999,999,999.99."),
    rateUnit: z.union([z.enum(RATE_UNITS), z.literal("")]),
    licenseNumber: short("license number"),
    insuranceProvider: short("provider"),
    insurancePolicyNumber: short("policy number"),
    // Input type="date" gives "" or "YYYY-MM-DD".
    insuranceExpiresOn: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a full date."),
    notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters."),
  })
  .superRefine((v, ctx) => {
    // Both or neither: the error goes under the empty one.
    if (v.rateAmount !== "" && v.rateUnit === "") ctx.addIssue({ code: "custom", path: ["rateUnit"], message: "Choose the unit, or clear the rate." });
    if (v.rateAmount === "" && v.rateUnit !== "") ctx.addIssue({ code: "custom", path: ["rateAmount"], message: "Enter the rate, or clear the unit." });
  });

export type VendorFormInput = z.input<typeof vendorSchema>;
export type VendorFormOutput = z.output<typeof vendorSchema>;
export type VendorField = keyof VendorFormInput;

export const VENDOR_FIELDS = [
  "name",
  "trade",
  "contactName",
  "phone",
  "email",
  "serviceArea",
  "rateAmount",
  "rateUnit",
  "licenseNumber",
  "insuranceProvider",
  "insurancePolicyNumber",
  "insuranceExpiresOn",
  "notes",
] as const satisfies readonly VendorField[];

/** The optional text fields: blank on the form = none (null on PATCH). */
const TEXT_FIELDS = ["contactName", "phone", "email", "serviceArea", "licenseNumber", "insuranceProvider", "insurancePolicyNumber", "notes"] as const;

/** Form values from a vendor, or empty. */
export function vendorDefaults(v?: Vendor): VendorFormInput {
  const cents = toCents(v?.rateAmount);
  return {
    name: v?.name ?? "",
    trade: v?.trade ?? "",
    contactName: v?.contactName ?? "",
    phone: v?.phone ?? "",
    email: v?.email ?? "",
    serviceArea: v?.serviceArea ?? "",
    rateAmount: cents > 0 ? centsToAmount(cents) : "",
    rateUnit: v?.rateUnit ?? "",
    licenseNumber: v?.licenseNumber ?? "",
    insuranceProvider: v?.insuranceProvider ?? "",
    insurancePolicyNumber: v?.insurancePolicyNumber ?? "",
    insuranceExpiresOn: v?.insuranceExpiresOn ?? "",
    notes: v?.notes ?? "",
  };
}

const amount = (v: number | "") => (v === "" ? null : centsToAmount(toCents(v)));

/** POST body: empty optional fields left out; the rate as a number with its unit. */
export function createVendorBody(v: VendorFormOutput): VendorCreateBody {
  const body: VendorCreateBody = { name: v.name, trade: v.trade };
  for (const f of TEXT_FIELDS) if (v[f]) body[f] = v[f];
  if (v.insuranceExpiresOn) body.insuranceExpiresOn = v.insuranceExpiresOn;
  if (v.rateAmount !== "" && v.rateUnit !== "") {
    body.rateAmount = amount(v.rateAmount)!;
    body.rateUnit = v.rateUnit;
  }
  return body;
}

/** PATCH body with only the changed fields (null when cleared). A rate change sends both parts, so the pair always matches. */
export function vendorChanges(v: VendorFormOutput, saved: Vendor): VendorUpdateBody {
  const before = vendorDefaults(saved);
  const body: VendorUpdateBody = {};
  if (v.name !== before.name) body.name = v.name;
  if (v.trade !== before.trade) body.trade = v.trade;
  for (const f of TEXT_FIELDS) if (v[f] !== before[f]) body[f] = v[f] || null;
  if (v.insuranceExpiresOn !== before.insuranceExpiresOn) body.insuranceExpiresOn = v.insuranceExpiresOn || null;
  const amountChanged = toCents(v.rateAmount || 0) !== toCents(before.rateAmount || 0);
  if (amountChanged || v.rateUnit !== before.rateUnit) {
    body.rateAmount = amount(v.rateAmount);
    body.rateUnit = v.rateUnit || null;
  }
  return body;
}

/** A backend message's field: name clashes (409) go under Name; others by their leading field name. */
export function vendorErrorField(message: string): VendorField | null {
  if (message.startsWith("A vendor named")) return "name";
  return VENDOR_FIELDS.find((f) => message === f || message.startsWith(`${f} `)) ?? null;
}
