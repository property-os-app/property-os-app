/** The Add / Edit expense form: schema, defaults, request bodies and error routing (rules.md "Expenses"). */
import { z } from "zod";
import { centsToAmount, todayISO, toCents } from "@/lib/format";
import { expenseTypeLabels, paymentMethodLabels } from "@/lib/labels";
import type { Expense, ExpenseCreateBody, ExpenseType, ExpenseUpdateBody } from "@/types/expense";
import type { PaymentMethod } from "@/types/ledger";

/** The Property select's value for "Portfolio-wide (no single property)" (no propertyId, Owner only). */
export const PORTFOLIO = "portfolio";

const TYPES = Object.keys(expenseTypeLabels) as [ExpenseType, ...ExpenseType[]];
const METHODS = Object.keys(paymentMethodLabels) as [PaymentMethod, ...PaymentMethod[]];
/** amount: 0.01 to 9,999,999,999.99. */
const MAX_AMOUNT_CENTS = 999_999_999_999;

export const expenseSchema = z.object({
  // Input type="date" gives "" or "YYYY-MM-DD".
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date."),
  description: z.string().trim().min(1, "Enter a description.").max(200, "Keep it under 200 characters."),
  amount: z
    .union([z.number(), z.literal("")])
    .refine((v) => v !== "" && toCents(v) > 0, "Enter an amount greater than $0.")
    .refine((v) => v === "" || toCents(v) <= MAX_AMOUNT_CENTS, "The amount can be at most $9,999,999,999.99."),
  category: z.string().min(1, "Choose a category."),
  type: z.enum(TYPES),
  /** A property id, or PORTFOLIO. */
  propertyId: z.string().min(1, "Choose a property."),
  // The unit select is disabled without a property, and a disabled input reads as undefined.
  unitId: z
    .string()
    .optional()
    .transform((v) => v ?? ""),
  vendorId: z.string(),
  paymentMethod: z.union([z.enum(METHODS), z.literal("")]),
  reference: z.string().trim().max(100, "Keep the reference under 100 characters."),
  notes: z.string().trim().max(2000, "Keep the notes under 2,000 characters."),
});

export type ExpenseFormInput = z.input<typeof expenseSchema>;
export type ExpenseFormOutput = z.output<typeof expenseSchema>;
export type ExpenseField = keyof ExpenseFormInput;

export const EXPENSE_FIELDS = [
  "date",
  "description",
  "amount",
  "category",
  "type",
  "propertyId",
  "unitId",
  "vendorId",
  "paymentMethod",
  "reference",
  "notes",
] as const satisfies readonly ExpenseField[];

/** Form values from an expense; a new one starts today, on the sidebar's property (if one is picked), as Operating. */
export function expenseDefaults(e?: Expense, scope?: string | null): ExpenseFormInput {
  const cents = toCents(e?.amount);
  return {
    date: e?.date ?? todayISO(),
    description: e?.description ?? "",
    amount: cents > 0 ? centsToAmount(cents) : "",
    category: e?.category ?? "",
    type: e?.type ?? "OPERATING",
    propertyId: e ? (e.propertyId ?? PORTFOLIO) : (scope ?? ""),
    unitId: e?.unitId ?? "",
    vendorId: e?.vendorId ?? "",
    paymentMethod: e?.paymentMethod ?? "",
    reference: e?.reference ?? "",
    notes: e?.notes ?? "",
  };
}

const amountOf = (v: number | "") => centsToAmount(toCents(v || 0));
const propertyOf = (v: string) => (v === PORTFOLIO ? null : v);

/** POST body: no propertyId for portfolio-wide; empty optional fields left out; the amount as a number. */
export function createExpenseBody(v: ExpenseFormOutput): ExpenseCreateBody {
  const body: ExpenseCreateBody = { date: v.date, description: v.description, amount: amountOf(v.amount), category: v.category, type: v.type };
  const propertyId = propertyOf(v.propertyId);
  if (propertyId) {
    body.propertyId = propertyId;
    if (v.unitId) body.unitId = v.unitId;
  }
  if (v.vendorId) body.vendorId = v.vendorId;
  if (v.paymentMethod) body.paymentMethod = v.paymentMethod;
  if (v.reference) body.reference = v.reference;
  if (v.notes) body.notes = v.notes;
  return body;
}

/**
 * PATCH body with only the changed fields (null when cleared). A category change always sends the type too (the server
 * would reset it to the new category's default otherwise); a property change always sends the unit (null or the new one).
 * An expense from a maintenance ticket never sends its property or unit (they follow the ticket: 409 otherwise).
 */
export function expenseChanges(v: ExpenseFormOutput, e: Expense): ExpenseUpdateBody {
  const body: ExpenseUpdateBody = {};
  if (v.date !== e.date) body.date = v.date;
  if (v.description !== e.description) body.description = v.description;
  if (toCents(v.amount || 0) !== toCents(e.amount)) body.amount = amountOf(v.amount);
  if (v.category !== e.category) {
    body.category = v.category;
    body.type = v.type;
  } else if (v.type !== e.type) body.type = v.type;
  const propertyId = propertyOf(v.propertyId);
  if (e.maintenanceTicketId) {
    // Locked: property and unit follow the ticket.
  } else if (propertyId !== e.propertyId) {
    body.propertyId = propertyId;
    body.unitId = propertyId && v.unitId ? v.unitId : null;
  } else if ((v.unitId || null) !== e.unitId) body.unitId = v.unitId || null;
  if ((v.vendorId || null) !== e.vendorId) body.vendorId = v.vendorId || null;
  if ((v.paymentMethod || null) !== e.paymentMethod) body.paymentMethod = v.paymentMethod || null;
  if ((v.reference || null) !== e.reference) body.reference = v.reference || null;
  if ((v.notes || null) !== e.notes) body.notes = v.notes || null;
  return body;
}

/** A backend message's field: validation messages by their leading field name, plus the property, unit and vendor messages. */
export function expenseErrorField(message: string): ExpenseField | null {
  if (message.startsWith("Only the Owner can record expenses for all properties") || message.startsWith("Property ")) return "propertyId";
  if (message.startsWith("Unit ")) return "unitId";
  if (message.startsWith("Vendor ")) return "vendorId";
  return EXPENSE_FIELDS.find((f) => message === f || message.startsWith(`${f} `)) ?? null;
}
