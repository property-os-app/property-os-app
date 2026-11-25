/** The tenant form: rules, values and the POST / PATCH bodies. No API import, so it is unit-testable. */
import { z } from "zod";
import { contactMethodLabels, tenantTypeLabels } from "@/lib/labels";
import type { ContactMethod, TenantCreateBody, TenantDetail, TenantType, TenantUpdateBody } from "@/types/tenant";

const TENANT_TYPES = Object.keys(tenantTypeLabels) as [TenantType, ...TenantType[]];
const CONTACT_METHODS = Object.keys(contactMethodLabels) as [ContactMethod, ...ContactMethod[]];

/** The fields a backend message can name. */
export const TENANT_FIELDS = ["fullName", "email", "phone", "idNumber", "address", "tenantType", "moveInDate", "preferredContactMethod", "notes"] as const;

/** "" or a valid email; shared with the new tenants of the Add old lease form. */
export const isEmailOrEmpty = (v: string) => v === "" || z.email().safeParse(v).success;
export const EMAIL_MESSAGE = "Enter a valid email, e.g. name@example.com.";

/** Only the name is required. Rules from ../property-os-api/docs/frontend-handoff/rules.md (Tenants). Every text field is trimmed before it is checked and sent. */
export const tenantSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the full name."),
  email: z.string().trim().refine(isEmailOrEmpty, EMAIL_MESSAGE),
  phone: z.string().trim(),
  idNumber: z.string().trim(),
  address: z.string().trim(),
  tenantType: z.enum(TENANT_TYPES),
  // Input type="date" gives "" or "YYYY-MM-DD"; the string is kept as it is.
  moveInDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a full date."),
  preferredContactMethod: z.enum(CONTACT_METHODS),
  notes: z.string().trim(),
});

export type TenantFormInput = z.input<typeof tenantSchema>;
export type TenantFormOutput = z.output<typeof tenantSchema>;

/** Form values from a tenant (GET /tenants/:id), or an empty form. */
export function tenantDefaults(t?: TenantDetail): TenantFormInput {
  return {
    fullName: t?.fullName ?? "",
    email: t?.email ?? "",
    phone: t?.phone ?? "",
    idNumber: t?.idNumber ?? "",
    address: t?.address ?? "",
    tenantType: t?.tenantType ?? "INDIVIDUAL",
    // "YYYY-MM-DD" in and out, kept as it is.
    moveInDate: t?.moveInDate ?? "",
    preferredContactMethod: t?.preferredContactMethod ?? "EMAIL",
    notes: t?.notes ?? "",
  };
}

/** POST body: optional fields only when filled. */
export function tenantCreateBody(v: TenantFormOutput): TenantCreateBody {
  return {
    fullName: v.fullName,
    tenantType: v.tenantType,
    preferredContactMethod: v.preferredContactMethod,
    ...(v.email ? { email: v.email } : {}),
    ...(v.phone ? { phone: v.phone } : {}),
    ...(v.idNumber ? { idNumber: v.idNumber } : {}),
    ...(v.address ? { address: v.address } : {}),
    ...(v.moveInDate ? { moveInDate: v.moveInDate } : {}),
    ...(v.notes ? { notes: v.notes } : {}),
  };
}

/** PATCH body with only the changed fields. email, phone, idNumber, address, moveInDate, notes: null when the user cleared them. */
export function tenantChanges(v: TenantFormOutput, t: TenantDetail): TenantUpdateBody {
  const before = tenantDefaults(t);
  const body: TenantUpdateBody = {};
  if (v.fullName !== before.fullName) body.fullName = v.fullName;
  if (v.email !== before.email) body.email = v.email || null;
  if (v.phone !== before.phone) body.phone = v.phone || null;
  if (v.tenantType !== before.tenantType) body.tenantType = v.tenantType;
  if (v.preferredContactMethod !== before.preferredContactMethod) body.preferredContactMethod = v.preferredContactMethod;
  if (v.idNumber !== before.idNumber) body.idNumber = v.idNumber || null;
  if (v.address !== before.address) body.address = v.address || null;
  if (v.moveInDate !== before.moveInDate) body.moveInDate = v.moveInDate || null;
  if (v.notes !== before.notes) body.notes = v.notes || null;
  return body;
}
