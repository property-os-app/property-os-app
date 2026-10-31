/** Types for the ledger, charges and payments endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2, 4 ("Charge", "Payment", "Ledger") and 5. */

export type ChargeType = "RENT" | "LATE_FEE" | "OTHER";

export type PaymentMethod = "ACH" | "CHECK" | "CREDIT_CARD" | "CASH" | "OTHER";

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
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Money string, may be negative (credit). */
  runningBalance: string;
}

/** GET /leases/:id/ledger. Entries come oldest first. */
export interface LedgerResponse {
  leaseId: string;
  leaseNumber: string;
  entries: LedgerEntry[];
  summary: {
    /** The lease's rent (fixed 2), null on DRAFT. */
    monthlyRent: string | null;
    totalCharged: string;
    totalPaid: string;
    /** totalCharged - totalPaid; negative = credit. */
    balance: string;
    oldestUnpaidDueDate: string | null;
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
  method: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

/** Void body for charges and payments: reason trimmed, 1–300 chars. OWNER only. */
export interface VoidBody {
  reason: string;
}
