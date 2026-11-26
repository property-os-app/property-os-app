/** Types for the ledger, charges and payments endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2, 4 ("Charge", "Payment", "Ledger") and 5. */

import type { Document } from "@/types/document";

export type ChargeType = "RENT" | "LATE_FEE" | "OTHER";

/**
 * In the order to show them (API.md section 2). DEPOSIT is set only by a deposit settlement (the part applied to the balance):
 * every request body refuses it. Show it as "Deposit applied".
 */
export type PaymentMethod = SelectablePaymentMethod | "DEPOSIT";

/** The methods a user can pick (every Method select: payments, expenses, ticket resolve, deposit refund). Never DEPOSIT. */
export type SelectablePaymentMethod = "ACH" | "CHECK" | "CREDIT_CARD" | "CASH" | "VENMO" | "ZELLE" | "OTHER";

/** POST /leases/:id/charges answer (ChargeResponse). */
export interface Charge {
  id: string;
  /** "INV-YYYY-NNNN". */
  invoiceNumber: string;
  leaseId: string;
  type: ChargeType;
  description: string;
  /** Money string (fixed 2). */
  amount: string;
  /** "YYYY-MM-DD". */
  dueDate: string;
  /** "YYYY-MM" on RENT charges, else null. */
  periodMonth: string | null;
  voided: boolean;
  /** ISO timestamp. */
  voidedAt: string | null;
  voidedById: string | null;
  voidReason: string | null;
  /** null = billed automatically by the system (API.md, Billing). */
  createdById: string | null;
  /** null = billed automatically: show "Auto-billed" (chargeAuthor). */
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /leases/:id/payments answer (PaymentResponse). */
export interface Payment {
  id: string;
  /** "PMT-YYYY-NNNN". */
  paymentNumber: string;
  leaseId: string;
  /** Money string (fixed 2). */
  amount: string;
  method: PaymentMethod;
  /** "YYYY-MM-DD". */
  paymentDate: string;
  referenceNumber: string | null;
  notes: string | null;
  voided: boolean;
  voidedAt: string | null;
  voidedById: string | null;
  voidReason: string | null;
  /** Its files (receipts...), kept when it is voided. */
  documentCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/** POST /leases/:id/payments answer only: the payment, and the document made from the sent file (null without one). */
export type PaymentRecorded = Payment & { document: Document | null };

export type LedgerEntryKind = "CHARGE" | "PAYMENT";

/** One ledger line: a charge (adds) or a payment (subtracts). Voided entries don't change runningBalance. */
export interface LedgerEntry {
  /** Charge id or payment id. */
  id: string;
  kind: LedgerEntryKind;
  /** invoiceNumber or paymentNumber. */
  number: string;
  /** Charges only. */
  type: ChargeType | null;
  /** Charges only. */
  description: string | null;
  /** dueDate (charge) or paymentDate (payment), "YYYY-MM-DD". */
  date: string;
  /** Money string (fixed 2), always positive. */
  amount: string;
  /** Payments only. */
  method: PaymentMethod | null;
  referenceNumber: string | null;
  notes: string | null;
  voided: boolean;
  voidReason: string | null;
  /** Payments: how many files they have. null on charges. */
  documentCount: number | null;
  /** Money string, may be negative (credit). */
  runningBalance: string;
}

/** Ledger card status (not a DB enum): VOID (voided), PAID (nothing left), OVERDUE (money left, due before UTC today), PARTIAL, UNPAID. */
export type LedgerCardStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" | "VOID";

/** One payment applied to a card, oldest first. */
export interface LedgerCardPayment {
  paymentId: string;
  paymentNumber: string;
  /** paymentDate, "YYYY-MM-DD". */
  date: string;
  method: PaymentMethod;
  /** Money string: the part of the payment that went to this charge. */
  appliedAmount: string;
}

/** One charge as a card (calculated on every read, FIFO; nothing stored). paid + remaining = amount; both "0.00" when VOID. */
export interface LedgerCard {
  chargeId: string;
  invoiceNumber: string;
  type: ChargeType;
  description: string;
  /** "YYYY-MM": periodMonth on RENT, else the dueDate's month. Group by it for a month view. */
  month: string;
  dueDate: string;
  amount: string;
  paid: string;
  remaining: string;
  status: LedgerCardStatus;
  voidReason: string | null;
  /** [] when voided or unpaid. */
  payments: LedgerCardPayment[];
}

/** One payment and the charges it paid (oldest first). applied + unapplied = amount; [] and "0.00" when voided. */
export interface LedgerPaymentAllocation {
  paymentId: string;
  paymentNumber: string;
  date: string;
  method: PaymentMethod;
  amount: string;
  voided: boolean;
  applied: { chargeId: string; invoiceNumber: string; amount: string }[];
  /** What is left of it (credit). */
  unapplied: string;
}

/** GET /leases/:id/ledger. Entries come oldest first; cards in FIFO order (dueDate, then created); allocations in payment order. */
export interface LedgerResponse {
  leaseId: string;
  leaseNumber: string;
  entries: LedgerEntry[];
  /** One per charge, voided included. */
  cards: LedgerCard[];
  /** One per payment, voided included. */
  paymentAllocations: LedgerPaymentAllocation[];
  summary: {
    /** The lease's rent (fixed 2), null on DRAFT. */
    monthlyRent: string | null;
    totalCharged: string;
    totalPaid: string;
    /** totalCharged - totalPaid; negative = credit. */
    balance: string;
    oldestUnpaidDueDate: string | null;
    /** Payments no charge has used yet (never negative): show "Credit". */
    credit: string;
  };
}

/** POST /leases/:id/charges body. periodMonth only (and always) on RENT. Amount is a JSON number, max 2 decimals. */
export interface ChargeCreateBody {
  type: ChargeType;
  description: string;
  amount: number;
  dueDate: string;
  periodMonth?: string;
}

/** POST /leases/:id/payments body. Overpayment is allowed. */
export interface PaymentCreateBody {
  amount: number;
  method: SelectablePaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  /** Category of the file sent along (API default RECEIPT); only with a file. */
  documentCategory?: string;
}

/** Void body for charges and payments: reason trimmed, 1–300 chars. OWNER only. */
export interface VoidBody {
  reason: string;
}
