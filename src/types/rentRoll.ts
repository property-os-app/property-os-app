/** Types for the rent roll endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2, 4 ("Rent roll", "Yearly rent roll") and 5. */
import type { LeaseStatus, SignatureStatus } from "@/types/lease";
import type { UnitStatus } from "@/types/unit";

/** Row status (not a DB enum). */
export type RentRollStatus = "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" | "NOT_BILLED";

/**
 * One lease in the month: ACTIVE and overlapping it, or owing at month end, or with a charge due or a payment dated in it.
 * Always, in cents: openingBalance + charged - paid = balance.
 */
export interface RentRollRow {
  leaseId: string;
  leaseNumber: string;
  /** Never DRAFT. ENDED / TERMINATED rows are never NOT_BILLED. */
  leaseStatus: Exclude<LeaseStatus, "DRAFT">;
  unit: { id: string; unitNumber: string; property: { id: string; name: string } };
  primaryTenant: { id: string; fullName: string } | null;
  /** Money (fixed 2) or null. */
  rent: string | null;
  depositHeld: string | null;
  /** rentDueDay in this month, clamped to the last day. */
  dueDate: string | null;
  /** Balance at the end of the previous month; negative = credit. */
  openingBalance: string;
  /** Non-voided charges of any type due in the month. */
  charged: string;
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

/* ---------- Yearly rent roll (GET /rent-roll/year). Source: API.md "Yearly rent roll (RentRollYearResponse)". ---------- */

/** A month cell's status: the monthly statuses plus FUTURE (NOT_BILLED after this month), VACANT and OUTSIDE_LEASE (both "0.00"). Never null. */
export type RentRollYearCellStatus = RentRollStatus | "FUTURE" | "VACANT" | "OUTSIDE_LEASE";

/** LEASE: the unit had at least one lease in the year. VACANT_UNIT: none (lease is null, leases is empty). */
export type RentRollYearRowKind = "LEASE" | "VACANT_UNIT";

/** ENDED: lease ENDED / TERMINATED or past its endDate. ENDS_SOON: ACTIVE and 0-60 days before endDate. */
export type RenewalAlert = "ENDED" | "ENDS_SOON";

/**
 * One month of a row. rows=lease: the lease's own month (exactly that month's GET /rent-roll row). Future months are never
 * OVERDUE. `balance` is info only.
 */
export interface RentRollYearCell {
  /** "YYYY-MM". */
  month: string;
  charged: string;
  paid: string;
  balance: string;
  status: RentRollYearCellStatus;
}

/**
 * One merged month of a unit row (rows=unit). Money is summed over the leases counted that month; status is the worst of
 * theirs (OVERDUE > UNPAID > PARTIAL > NOT_BILLED > PAID > FUTURE).
 */
export interface RentRollYearUnitCell extends RentRollYearCell {
  /** The lease(s) counted in this month, oldest first ([] when none: VACANT / FUTURE / OUTSIDE_LEASE with "0.00"). */
  leaseIds: string[];
  /** The newest of leaseIds, null when none. */
  leaseId: string | null;
}

export interface RentRollYearLease {
  id: string;
  leaseNumber: string;
  /** Never DRAFT. */
  status: Exclude<LeaseStatus, "DRAFT">;
  signatureStatus: SignatureStatus;
  startDate: string | null;
  endDate: string | null;
  rent: string | null;
  deposit: string | null;
  /** Primary first, then fullName A→Z. */
  tenants: { id: string; fullName: string; isPrimary: boolean }[];
}

/** A lease of a unit row's year, with the year's months its term overlaps (may be empty: only listed for a carried balance). */
export interface RentRollYearUnitLease extends RentRollYearLease {
  monthsCovered: string[];
}

/** The next lease on the same unit (DRAFT included). sharesTenant: at least one tenant in common. */
export interface RentRollYearNextLease {
  id: string;
  leaseNumber: string;
  status: LeaseStatus;
  startDate: string | null;
  sharesTenant: boolean;
}

/** The fields both row shapes share. */
interface RentRollYearRowBase {
  /** rows=unit: LEASE when `leases` is not empty. rows=lease: VACANT_UNIT is a unit with no lease row that year. */
  kind: RentRollYearRowKind;
  /** status is the unit's status now; monthlyRent is the listed ("market") rent. */
  unit: { id: string; unitNumber: string; status: UnitStatus; monthlyRent: string; property: { id: string; name: string } };
  /** rows=lease: the row's lease. rows=unit: the current lease (the ACTIVE one covering today, else the latest to start). null without one. */
  lease: RentRollYearLease | null;
  totalCharged: string;
  /** The spreadsheet's "Total" column. */
  totalPaid: string;
  /** Non-voided LATE_FEE charges due in the year, already inside charged. */
  lateFees: string;
  /** The unit's months with no lease term, up to the current UTC month only. Same on every row of the unit. */
  vacantMonths: string[];
  /** endDate − today (UTC), may be negative. null on vacant rows, ENDED / TERMINATED leases and without an endDate. */
  daysToLeaseEnd: number | null;
  renewalAlert: RenewalAlert | null;
  nextLease: RentRollYearNextLease | null;
}

/** rows=lease: one row per lease that appears in the year (a unit with two tenants has two rows), plus one VACANT_UNIT row per unit without one. */
export interface RentRollYearLeaseRow extends RentRollYearRowBase {
  /** Always 12, January first. */
  months: RentRollYearCell[];
}

/** rows=unit (the default): one row per unit, vacant and reserved units included, its leases merged month by month. */
export interface RentRollYearUnitRow extends RentRollYearRowBase {
  /** Every lease of the unit that touched the year, startDate oldest first. */
  leases: RentRollYearUnitLease[];
  /** Always 12, January first. */
  months: RentRollYearUnitCell[];
}

/** Either row shape (the year view handles both; `isUnitRow` tells them apart). */
export type RentRollYearRow = RentRollYearUnitRow | RentRollYearLeaseRow;

/** ?rows= and the response's rowsBy. */
export type RentRollYearRowsBy = "unit" | "lease";

export interface RentRollYearTotals {
  /** 12, January first. */
  months: { month: string; charged: string; paid: string }[];
  totalCharged: string;
  totalPaid: string;
  lateFees: string;
}

interface RentRollYearResponseBase {
  year: number;
  /** The 12 "YYYY-MM" months, January first (column headers). */
  months: string[];
  /** The year picker's range: earliest lease year (≤ current UTC year, ≥ 2000) to next UTC year. */
  availableYears: { from: number; to: number };
  /** One per property with at least one row, name A→Z. The same in both modes. */
  propertyTotals: (RentRollYearTotals & { property: { id: string; name: string } })[];
  /** The same in both modes. */
  totals: RentRollYearTotals;
}

/**
 * GET /rent-roll/year. Totals add up to the cent: use them, never recompute. `rowsBy` (the echo of ?rows=) tells the row
 * shape: "unit" one row per unit (property A→Z, then unit number), "lease" one row per lease (then startDate oldest first).
 */
export type RentRollYearResponse =
  | (RentRollYearResponseBase & { rowsBy: "unit"; rows: RentRollYearUnitRow[] })
  | (RentRollYearResponseBase & { rowsBy: "lease"; rows: RentRollYearLeaseRow[] });
