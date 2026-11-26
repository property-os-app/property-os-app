/**
 * Types for the deposit and end-of-lease endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2, 4
 * ("Deposit", "EndPreview") and 5 (Deposits, POST /leases/:id/end, end-preview, void-charges-after-end).
 */
import type { LeaseStatus } from "@/types/lease";
import type { ChargeType, LedgerCardStatus, PaymentMethod, SelectablePaymentMethod } from "@/types/ledger";

/** Calculated, never stored. null: no deposit, or not tracked (settled outside the app). */
export type DepositStatus = "HELD" | "PARTIALLY_RETURNED" | "RETURNED" | "KEPT";

/** One kept part of the deposit (cleaning, damage, keys...). In the order sent. */
export interface DepositDeduction {
  id: string;
  reason: string;
  /** Money string. */
  amount: string;
}

/** A saved settlement. Always deductionsTotal + appliedToBalance + refundAmount = totalHeld. */
export interface DepositSettlement {
  settledOn: string;
  deductions: DepositDeduction[];
  deductionsTotal: string;
  appliedToBalance: string;
  /** The DEPOSIT payment that applies appliedToBalance; null when it is 0. */
  payment: { paymentId: string; paymentNumber: string } | null;
  refundAmount: string;
  refundDate: string | null;
  /** Never DEPOSIT in practice (the API refuses it). */
  refundMethod: PaymentMethod | null;
  refundReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET / PUT /leases/:id/deposit (DepositResponse). */
export interface DepositResponse {
  leaseId: string;
  leaseNumber: string;
  leaseStatus: LeaseStatus;
  securityDeposit: string | null;
  petDeposit: string | null;
  /** securityDeposit + petDeposit (missing = 0). */
  totalHeld: string;
  /** false: ended before endedOn existed, or history-only ("Not tracked"). */
  tracked: boolean;
  status: DepositStatus | null;
  /** The lease's balance without this settlement's own DEPOSIT payment; may be negative. */
  openBalance: string;
  /** min(totalHeld, max(openBalance, 0)): the most appliedToBalance may be. */
  maxApplicable: string;
  /** The balance fell below the applied amount since saving: re-save to correct it. */
  appliedExceedsBalance: boolean;
  /** Lease documents with category SECURITY_DEPOSIT (refund proof...). */
  documentCount: number;
  settlement: DepositSettlement | null;
  /** The whole deposit as a refund, only while nothing is settled on a tracked lease with a deposit. */
  suggested: { deductions: { reason: string; amount: string }[]; appliedToBalance: string; refundAmount: string } | null;
}

/** PUT /leases/:id/deposit body (also `deposit` on POST /leases/:id/end). Money is a JSON number. Never null on settledOn / deductions. */
export interface DepositBody {
  settledOn?: string;
  deductions: { reason: string; amount: number }[];
  appliedToBalance: number;
  refundAmount: number;
  /** These three need refundAmount > 0. */
  refundDate?: string | null;
  refundMethod?: SelectablePaymentMethod | null;
  refundReference?: string | null;
  notes?: string | null;
}

/** One charge in an end preview. `paid` / `status` are the ledger card's (FIFO). */
export interface EndPreviewCharge {
  chargeId: string;
  invoiceNumber: string;
  type: ChargeType;
  description: string;
  /** "YYYY-MM": periodMonth on RENT, else the dueDate's month. */
  month: string;
  dueDate: string;
  amount: string;
  paid: string;
  status: LedgerCardStatus;
}

/** GET /leases/:id/end-preview (?endedOn=). Nothing is written. */
export interface EndPreview {
  leaseId: string;
  leaseNumber: string;
  leaseStatus: LeaseStatus;
  /** The end used; null when cancelled. */
  endedOn: string | null;
  /** Hasn't started (or was cancelled): every RENT charge counts as after the end. */
  cancelled: boolean;
  /** RENT charges for months fully after endedOn's month: what voidChargesAfterEnd voids. */
  chargesToVoid: EndPreviewCharge[];
  /** LATE_FEE / OTHER charges due after endedOn: information only, never voided automatically. */
  otherChargesAfterEnd: EndPreviewCharge[];
  balanceNow: string;
  /** balanceNow minus the chargesToVoid amounts; negative = credit. */
  balanceAfterVoid: string;
  deposit: { securityDeposit: string | null; petDeposit: string | null; totalHeld: string; status: DepositStatus | null };
}

/** A charge voided by ending the lease (or by void-charges-after-end). */
export interface VoidedCharge {
  chargeId: string;
  invoiceNumber: string;
  month: string;
  dueDate: string;
  amount: string;
}

/** POST /leases/:id/void-charges-after-end answer. */
export interface VoidAfterEndResult {
  leaseId: string;
  leaseNumber: string;
  voidedCharges: VoidedCharge[];
  /** The lease's balance after the voids. */
  balance: string;
}
