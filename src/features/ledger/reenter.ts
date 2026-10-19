import type { QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toCents, centsToAmount } from "@/lib/format";
import { refreshAfterMoneyChange } from "@/features/ledger/hooks";
import type { Charge, ChargeCreateBody, ChargeType, LedgerEntry, Payment, PaymentCreateBody, PaymentMethod } from "@/types/ledger";

/**
 * Re-entering a voided charge or payment. Voids stay permanent in the backend: a re-entry is a new entry with a new number.
 * Plain functions (no hooks) so the toast's Undo still works after the void modal has closed.
 */

const MAX_NOTES = 1000;

/** "Re-entered after an accidental void of PMT-...", plus the original notes on a new line when both fit in 1000 characters. */
export function reentryNote(number: string, originalNotes: string | null | undefined): string {
  const base = `Re-entered after an accidental void of ${number}`;
  const original = originalNotes?.trim();
  if (!original) return base;
  const both = `${base}\n${original}`;
  return both.length <= MAX_NOTES ? both : base;
}

/** Record Payment prefill (CurrencyInput takes a number). */
export interface PaymentPrefill {
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  referenceNumber: string;
  notes: string;
}

/** Add charge prefill. `periodMonth` is the RENT month ("YYYY-MM"), null for other types. */
export interface ChargePrefill {
  type: ChargeType;
  description: string;
  amount: number;
  dueDate: string;
  periodMonth: string | null;
}

/** A voided payment row (or void response) -> the Record Payment values, with the re-entry note. */
export function paymentPrefill(p: { number: string; amount: string; method: PaymentMethod; paymentDate: string; referenceNumber: string | null; notes: string | null }): PaymentPrefill {
  return {
    amount: centsToAmount(toCents(p.amount)),
    method: p.method,
    paymentDate: p.paymentDate,
    referenceNumber: p.referenceNumber ?? "",
    notes: reentryNote(p.number, p.notes),
  };
}

/** A voided ledger row -> its prefill. RENT rows have no periodMonth in the ledger: the due date's month is used. Null for a broken row. */
export function prefillFromEntry(e: LedgerEntry): { kind: "PAYMENT"; values: PaymentPrefill } | { kind: "CHARGE"; values: ChargePrefill } | null {
  if (e.kind === "PAYMENT") {
    if (!e.method) return null;
    return {
      kind: "PAYMENT",
      values: paymentPrefill({ number: e.number, amount: e.amount, method: e.method, paymentDate: e.date, referenceNumber: e.referenceNumber, notes: e.notes }),
    };
  }
  if (!e.type) return null;
  return {
    kind: "CHARGE",
    values: {
      type: e.type,
      description: e.description ?? "",
      amount: centsToAmount(toCents(e.amount)),
      dueDate: e.date,
      // "YYYY-MM-DD" -> "YYYY-MM" (string slice, no Date parsing).
      periodMonth: e.type === "RENT" ? e.date.slice(0, 7) : null,
    },
  };
}

const leasePath = (id: string) => `/leases/${encodeURIComponent(id)}`;

/** Undo from the void toast: re-creates the payment as it was (new PMT number). Same refresh as every money change. */
export async function reenterPayment(qc: QueryClient, voided: Payment): Promise<Payment> {
  const v = paymentPrefill({ ...voided, number: voided.paymentNumber });
  const body: PaymentCreateBody = {
    amount: v.amount,
    method: v.method,
    paymentDate: v.paymentDate,
    notes: v.notes,
    ...(v.referenceNumber ? { referenceNumber: v.referenceNumber } : {}),
  };
  const saved = await apiFetch<Payment>(`${leasePath(voided.leaseId)}/payments`, { method: "POST", body });
  refreshAfterMoneyChange(qc);
  return saved;
}

/** Undo from the void toast: re-creates the charge as it was (new INV number). periodMonth only on RENT. */
export async function reenterCharge(qc: QueryClient, voided: Charge): Promise<Charge> {
  const body: ChargeCreateBody = {
    type: voided.type,
    description: voided.description,
    amount: centsToAmount(toCents(voided.amount)),
    dueDate: voided.dueDate,
    ...(voided.type === "RENT" && voided.periodMonth ? { periodMonth: voided.periodMonth } : {}),
  };
  const saved = await apiFetch<Charge>(`${leasePath(voided.leaseId)}/charges`, { method: "POST", body });
  refreshAfterMoneyChange(qc);
  return saved;
}
