/** The Add / Edit ticket form and the Resolve form: schemas, defaults, request bodies and error routing (rules.md "Maintenance"). */
import { z } from "zod";
import { centsToAmount, toCents } from "@/lib/format";
import { paymentMethodLabels, priorityLabels } from "@/lib/labels";
import type { PaymentMethod } from "@/types/ledger";
import type { MaintenancePriority, MaintenanceTicket, TicketCreateBody, TicketResolveBody, TicketUpdateBody } from "@/types/maintenance";

const PRIORITY_KEYS = Object.keys(priorityLabels) as [MaintenancePriority, ...MaintenancePriority[]];
const METHODS = Object.keys(paymentMethodLabels) as [PaymentMethod, ...PaymentMethod[]];
/** Money: 0 to 9,999,999,999.99. */
const MAX_CENTS = 999_999_999_999;

/** Suggestions for the location note (free text, ≤ 100). */
export const LOCATION_SUGGESTIONS = ["Common area", "Exterior"];

const money = z.union([z.number(), z.literal("")]).refine((v) => v === "" || toCents(v) <= MAX_CENTS, "The amount can be at most $9,999,999,999.99.");

export const ticketSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(150, "Keep the title under 150 characters."),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters."),
  // Disabled selects (locked property / unit) read as undefined.
  propertyId: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  unitId: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  locationNote: z.string().trim().max(100, "Keep the location under 100 characters."),
  priority: z.enum(PRIORITY_KEYS, { message: "Choose a priority." }),
  vendorId: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  estimatedCost: money,
});

export type TicketFormInput = z.input<typeof ticketSchema>;
export type TicketFormOutput = z.output<typeof ticketSchema>;
export type TicketField = keyof TicketFormInput;

export const TICKET_FIELDS = [
  "title",
  "description",
  "propertyId",
  "unitId",
  "locationNote",
  "priority",
  "vendorId",
  "estimatedCost",
] as const satisfies readonly TicketField[];

const amountOf = (v: number | "") => centsToAmount(toCents(v || 0));
const centsOrNull = (v: number | "" | string | null) => (v === "" || v === null ? null : toCents(v));

/** Form values from a ticket; a new one starts on the sidebar's property (if one is picked), Normal priority. */
export function ticketDefaults(t?: MaintenanceTicket, scope?: string | null): TicketFormInput {
  return {
    title: t?.title ?? "",
    description: t?.description ?? "",
    propertyId: t?.propertyId ?? scope ?? "",
    unitId: t?.unitId ?? "",
    locationNote: t?.locationNote ?? "",
    priority: t?.priority ?? "NORMAL",
    vendorId: t?.vendorId ?? "",
    estimatedCost: t?.estimatedCost !== null && t?.estimatedCost !== undefined ? centsToAmount(toCents(t.estimatedCost)) : "",
  };
}

/** POST body: empty optional fields left out; the cost as a number. With a vendor the ticket starts ASSIGNED. */
export function createTicketBody(v: TicketFormOutput): TicketCreateBody {
  const body: TicketCreateBody = { title: v.title, propertyId: v.propertyId, priority: v.priority };
  if (v.description) body.description = v.description;
  if (v.unitId) body.unitId = v.unitId;
  if (v.locationNote) body.locationNote = v.locationNote;
  if (v.estimatedCost !== "") body.estimatedCost = amountOf(v.estimatedCost);
  if (v.vendorId) body.vendorId = v.vendorId;
  return body;
}

/**
 * PATCH body for an active ticket, only the changed fields (null when cleared). A property change always sends the unit
 * (null or one of the new property). With linked expenses the property and unit are never sent (locked, 409 otherwise).
 * The vendor never goes here (assign / unassign).
 */
export function ticketChanges(v: TicketFormOutput, t: MaintenanceTicket): TicketUpdateBody {
  const body: TicketUpdateBody = {};
  if (v.title !== t.title) body.title = v.title;
  if ((v.description || null) !== t.description) body.description = v.description || null;
  if (v.priority !== t.priority) body.priority = v.priority;
  if (t.expenses.length === 0) {
    if (v.propertyId && v.propertyId !== t.propertyId) {
      body.propertyId = v.propertyId;
      body.unitId = v.unitId || null;
    } else if ((v.unitId || null) !== t.unitId) body.unitId = v.unitId || null;
  }
  if ((v.locationNote || null) !== t.locationNote) body.locationNote = v.locationNote || null;
  const cost = centsOrNull(v.estimatedCost);
  if (cost !== centsOrNull(t.estimatedCost)) body.estimatedCost = cost === null ? null : centsToAmount(cost);
  return body;
}

/** A RESOLVED ticket's edit: only the note and the rating (the rating only when the ticket has a vendor). */
export function resolutionChanges(v: { resolutionNote: string; vendorRating: number | null }, t: MaintenanceTicket): TicketUpdateBody {
  const body: TicketUpdateBody = {};
  const note = v.resolutionNote.trim() || null;
  if (note !== t.resolutionNote) body.resolutionNote = note;
  if (t.vendorId && v.vendorRating !== t.vendorRating) body.vendorRating = v.vendorRating;
  return body;
}

export interface ResolveInput {
  resolutionNote: string;
  actualCost: number | "";
  paymentMethod: PaymentMethod | "";
  reference: string;
  vendorRating: number | null;
}

export const resolveSchema = z.object({
  resolutionNote: z.string().trim().max(2000, "Keep the note under 2,000 characters."),
  actualCost: money,
  paymentMethod: z.union([z.enum(METHODS), z.literal("")]),
  reference: z.string().trim().max(100, "Keep the reference under 100 characters."),
  vendorRating: z.number().int().min(1).max(5).nullable(),
});

/**
 * POST /resolve body. The cost, payment method and reference go only when the caller may record expenses and the cost is
 * above $0 (a cost of 0 records nothing). The rating goes only when the ticket has a vendor (400 otherwise).
 */
export function resolveBody(v: ResolveInput, opts: { canRecordCost: boolean; hasVendor: boolean }): TicketResolveBody {
  const body: TicketResolveBody = {};
  const note = v.resolutionNote.trim();
  if (note) body.resolutionNote = note;
  if (opts.canRecordCost && v.actualCost !== "" && toCents(v.actualCost) > 0) {
    body.actualCost = amountOf(v.actualCost);
    if (v.paymentMethod) body.paymentMethod = v.paymentMethod;
    const reference = v.reference.trim();
    if (reference) body.reference = reference;
  }
  if (opts.hasVendor && v.vendorRating !== null) body.vendorRating = v.vendorRating;
  return body;
}

/** A backend message's field: property, unit and vendor messages, then validation messages by their leading field name. */
export function ticketErrorField(message: string): TicketField | null {
  if (message.startsWith("Property ") || message.includes("its property and unit can't change")) return "propertyId";
  if (message.startsWith("Unit ")) return "unitId";
  if (message.startsWith("Vendor ")) return "vendorId";
  return TICKET_FIELDS.find((f) => message === f || message.startsWith(`${f} `)) ?? null;
}
