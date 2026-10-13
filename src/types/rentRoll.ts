/** Types for the rent roll endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2, 4 ("Rent roll", "GenerateRentResponse") and 5. */
import type { LeaseStatus } from "@/types/lease";

/** Row status (not a DB enum). */
export type RentRollStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" | "NOT_BILLED";

/** One lease in the month: ACTIVE leases overlapping it, plus ENDED / TERMINATED leases with a balance > 0. */
export interface RentRollRow {
  leaseId: string;
  leaseNumber: string;
  /** Never DRAFT. */
  leaseStatus: Exclude<LeaseStatus, "DRAFT">;
  unit: { id: string; unitNumber: string; property: { id: string; name: string } };
  primaryTenant: { id: string; fullName: string } | null;
  /** Money (fixed 2) or null. */
  rent: string | null;
  depositHeld: string | null;
  /** rentDueDay in this month, clamped to the last day. */
  dueDate: string | null;
  /** Non-voided payments dated in the month. */
  paid: string;
  /** As of the month's last day; negative = credit. */
  balance: string;
  oldestUnpaidDueDate: string | null;
  status: RentRollStatus;
  lastPaymentDate: string | null;
}

/** GET /rent-roll. The summary covers every row before status / search filtering. */
export interface RentRollResponse {
  /** "YYYY-MM". */
  month: string;
  rows: RentRollRow[];
  summary: {
    totalRentDue: string;
    collected: string;
    /** "85.50", or null when totalRentDue is 0. */
    collectionRate: string | null;
    /** Sum of positive row balances (never negative). */
    outstandingBalance: string;
    overdueCount: number;
    overdueTotal: string;
    securityDepositsHeld: string;
    activeDepositCount: number;
  };
}

/** POST /rent-roll/generate answer. */
export interface GenerateRentResponse {
  month: string;
  created: number;
  skippedExisting: number;
  skippedNonMonthly: number;
  skippedOutsideTerm: number;
}
