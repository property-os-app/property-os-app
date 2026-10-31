/** Types for the expense endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("Expense", "ExpenseList", "ExpenseSummary", "Catalog items") and section 5 ("Expenses"). */
import type { PaymentMethod } from "@/types/ledger";

export type ExpenseType = "OPERATING" | "CAPITAL";

/** Voiding is the `voided` flag, not a status. */
export type ExpenseStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

/** GET /expenses/categories (catalog order). */
export interface ExpenseCategory {
  key: string;
  label: string;
  defaultType: ExpenseType;
}

/** What the caller can do with this expense right now (the server enforces the same rules). */
export interface ExpenseAllowedActions {
  edit: boolean;
  approve: boolean;
  reject: boolean;
  void: boolean;
  delete: boolean;
}

type UserRef = { id: string; name: string };

/** GET /expenses (items), GET /expenses/:id and every expense write. */
export interface Expense {
  id: string;
  /** "EXP-2026-0001". */
  expenseNumber: string;
  /** "YYYY-MM-DD": the day the money was spent. */
  date: string;
  description: string;
  /** A key from GET /expenses/categories. */
  category: string;
  type: ExpenseType;
  /** Money string, > 0. */
  amount: string;
  /** Vendor invoice or other reference number. */
  reference: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  status: ExpenseStatus;
  /** null = portfolio-wide (no single property, Owner only). */
  propertyId: string | null;
  property: { id: string; name: string } | null;
  unitId: string | null;
  /** Always a unit of `property`. */
  unit: { id: string; unitNumber: string } | null;
  vendorId: string | null;
  /** May be archived. */
  vendor: { id: string; name: string; trade: string } | null;
  /** Set when a ticket's resolve recorded it; while set, propertyId and unitId can't change. */
  maintenanceTicketId: string | null;
  maintenanceTicket: { id: string; ticketNumber: number; title: string } | null;
  createdById: string;
  createdBy: UserRef;
  approvedById: string | null;
  approvedBy: UserRef | null;
  rejectedById: string | null;
  rejectedBy: UserRef | null;
  voidedById: string | null;
  voidedBy: UserRef | null;
  /** ISO timestamps. */
  approvedAt: string | null;
  rejectedAt: string | null;
  voidedAt: string | null;
  /** Set only while REJECTED. */
  rejectionReason: string | null;
  /** voidedAt !== null; only an APPROVED expense can be voided. */
  voided: boolean;
  voidReason: string | null;
  allowedActions: ExpenseAllowedActions;
  createdAt: string;
  updatedAt: string;
}

/** GET /expenses: one page plus totals over every matching row. */
export interface ExpenseList {
  items: Expense[];
  page: number;
  pageSize: number;
  totalItems: number;
  /** 0 when nothing matches. */
  totalPages: number;
  totals: {
    /** APPROVED, non-voided. */
    approvedAmount: string;
    pendingAmount: string;
    pendingCount: number;
  };
}

export interface CategoryTotal {
  category: string;
  total: string;
  /** Percent of `total`, 1 decimal. */
  percent: number;
}

/** GET /expenses/summary: APPROVED, non-voided expenses only. */
export interface ExpenseSummary {
  /** The range used, "YYYY-MM-DD". */
  from: string;
  to: string;
  propertyId: string | null;
  total: string;
  /** The same dates one year earlier. */
  previousPeriod: { from: string; to: string; total: string };
  /** 1 decimal; null when the previous total is 0. */
  changePercent: number | null;
  /** total ÷ calendar months from..to (both counted). */
  averageMonthly: string;
  largestCategory: CategoryTotal | null;
  /** Every PENDING_APPROVAL expense in scope, ignoring the dates. */
  pending: { count: number; total: string };
  /** Above 0 only, largest first. */
  byCategory: CategoryTotal[];
}

/** GET /expenses query. Booleans go as "true". (A type alias, so it fits apiFetch's `query`.) */
export type ExpenseListQuery = {
  page: number;
  pageSize: number;
  sort?: "date" | "amount";
  order?: "asc" | "desc";
  search?: string;
  propertyId?: string;
  /** Owner only: only portfolio-wide expenses. Never with propertyId or unitId. */
  allProperties?: boolean;
  unitId?: string;
  category?: string;
  vendorId?: string;
  /** Only the expenses that ticket's resolves recorded. */
  maintenanceTicketId?: string;
  type?: ExpenseType;
  status?: ExpenseStatus;
  from?: string;
  to?: string;
  includeVoided?: boolean;
};

/** GET /expenses/summary query. */
export type ExpenseSummaryQuery = {
  from: string;
  to: string;
  propertyId?: string;
};

/** POST /expenses body. amount is a number (max 2 decimals). No propertyId = portfolio-wide (Owner only). */
export interface ExpenseCreateBody {
  date: string;
  description: string;
  amount: number;
  category: string;
  type?: ExpenseType;
  propertyId?: string;
  unitId?: string;
  vendorId?: string;
  reference?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/** PATCH /expenses/:id body. null clears propertyId (portfolio-wide), unitId, vendorId, reference, paymentMethod, notes. */
export interface ExpenseUpdateBody {
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
  type?: ExpenseType;
  propertyId?: string | null;
  unitId?: string | null;
  vendorId?: string | null;
  reference?: string | null;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
}
