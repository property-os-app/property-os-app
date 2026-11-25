/** The Record Payment request, and what to do when its reply is lost. No API import, so it is unit-testable. */
import { toCents } from "@/lib/format";
import type { DocumentCategoryOption } from "@/types/document";
import type { LedgerEntry, PaymentCreateBody, PaymentRecorded } from "@/types/ledger";

/** The category the API gives a file sent with a payment when none is named. */
const DEFAULT_RECEIPT_CATEGORY = "RECEIPT";

/** The receipt picked in the Record Payment form. `category` null: the default one. */
export interface ReceiptValue {
  file: File | null;
  category: string | null;
}

/** The category to send: the chosen one, else Receipt once the API's list is there; "" (the API's own default) while it isn't. */
export function receiptCategory(value: ReceiptValue, options: DocumentCategoryOption[]): string {
  return value.category ?? options.find((o) => o.value === DEFAULT_RECEIPT_CATEGORY)?.value ?? "";
}

/**
 * POST /leases/:id/payments: plain JSON, or with a file multipart: `data` (the JSON as text, with the file's category when
 * one is chosen) and `file`. Any other field is 400.
 */
export function paymentRequest(body: PaymentCreateBody, file: File | null, category: string): { body: PaymentCreateBody } | { form: FormData } {
  if (!file) return { body };
  const form = new FormData();
  form.append("data", JSON.stringify(category ? { ...body, documentCategory: category } : body));
  form.append("file", file, file.name);
  return { form };
}

/** The answer really is a payment (and not, say, a proxy's page). */
export function isPaymentAnswer(value: unknown): value is PaymentRecorded {
  return typeof value === "object" && value !== null && typeof (value as { paymentNumber?: unknown }).paymentNumber === "string";
}

/**
 * The payment may have been saved although the reply says otherwise: no answer (status 0) or a 5xx. A 4xx is a clear "no".
 * `status` null: not an API error at all.
 */
export function isUnclearReply(status: number | null): boolean {
  return status === null || status === 0 || status >= 500;
}

export const UNCLEAR_PAYMENT_MESSAGE = "We didn't get an answer, so the payment may have been saved. Check the ledger before trying again.";

/**
 * The newest live payment of the ledger that looks like the one just sent: same amount, date, method and reference.
 * `known`: ids that were in the ledger before sending, so never the one just sent.
 */
export function findPayment(entries: LedgerEntry[], body: PaymentCreateBody, known: ReadonlySet<string> = new Set()): LedgerEntry | undefined {
  return entries.findLast(
    (e) =>
      e.kind === "PAYMENT" &&
      !e.voided &&
      !known.has(e.id) &&
      toCents(e.amount) === toCents(body.amount) &&
      e.date === body.paymentDate &&
      e.method === body.method &&
      (e.referenceNumber ?? "").trim() === (body.referenceNumber ?? "").trim(),
  );
}

/** "file" / "documentCategory" when a backend message is about the receipt (400, 413, 415), else null. */
export function receiptErrorField(message: string, status: number): "file" | "documentCategory" | null {
  if (status === 413 || status === 415 || message.startsWith("file ") || message.startsWith("File too large")) return "file";
  return message.startsWith("documentCategory") ? "documentCategory" : null;
}
