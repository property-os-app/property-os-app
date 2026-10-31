/** Types for the maintenance ticket endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("MaintenanceTicket", "TicketList", "TicketSummary") and section 5 ("Maintenance tickets"). */
import type { ExpenseStatus } from "@/types/expense";
import type { PaymentMethod } from "@/types/ledger";

/** Also the `sort=priority` order. */
export type MaintenancePriority = "EMERGENCY" | "URGENT" | "NORMAL" | "LOW";

/** "Active" = OPEN, ASSIGNED or IN_PROGRESS. CANCELLED is final. */
export type MaintenanceStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";

/** What the caller can do right now. `resolve` doesn't include the expenses.record check for a cost. */
export interface TicketAllowedActions {
  edit: boolean;
  assign: boolean;
  unassign: boolean;
  start: boolean;
  resolve: boolean;
  reopen: boolean;
  cancel: boolean;
}

/** One linked expense (recorded by a resolve with a cost), oldest first. */
export interface TicketExpense {
  id: string;
  expenseNumber: string;
  /** Money string. */
  amount: string;
  status: ExpenseStatus;
  voided: boolean;
}

type UserRef = { id: string; name: string };

/** GET /maintenance-tickets (items), GET /maintenance-tickets/:id and every ticket write. */
export interface MaintenanceTicket {
  id: string;
  /** From 1001; shown as "#1042". */
  ticketNumber: number;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  propertyId: string;
  property: { id: string; name: string };
  unitId: string | null;
  /** Always a unit of `property`. */
  unit: { id: string; unitNumber: string } | null;
  /** e.g. "Common area". */
  locationNote: string | null;
  /** The assignee. */
  vendorId: string | null;
  /** May be archived. */
  vendor: { id: string; name: string; trade: string } | null;
  /** ISO timestamps. */
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  /** Money string, what was typed in. */
  estimatedCost: string | null;
  /** Money string: linked expenses that are neither voided nor rejected (pending count); null when there are none. */
  actualCost: string | null;
  expenses: TicketExpense[];
  resolutionNote: string | null;
  /** 1–5. */
  vendorRating: number | null;
  cancelReason: string | null;
  resolvedById: string | null;
  resolvedBy: UserRef | null;
  cancelledById: string | null;
  cancelledBy: UserRef | null;
  createdById: string;
  createdBy: UserRef;
  /** hours 4 / 24 / null; pastSla only while active. */
  sla: { hours: number | null; dueAt: string | null; pastSla: boolean };
  allowedActions: TicketAllowedActions;
  createdAt: string;
  updatedAt: string;
}

/** Every status, 0 when none; counts every ticket matching the other filters (ignores status and includeCancelled). */
export type TicketStatusCounts = Record<MaintenanceStatus, number>;

/** GET /maintenance-tickets: one page plus statusCounts. */
export interface TicketList {
  items: MaintenanceTicket[];
  page: number;
  pageSize: number;
  totalItems: number;
  /** 0 when nothing matches. */
  totalPages: number;
  statusCounts: TicketStatusCounts;
}

/** GET /maintenance-tickets/summary. */
export interface TicketSummary {
  propertyId: string | null;
  /** The range used, "YYYY-MM-DD" (default year to date). */
  from: string;
  to: string;
  /** Active tickets now; lastWeek is approximate; change = count − lastWeek. */
  open: { count: number; lastWeek: number; change: number };
  /** Active EMERGENCY tickets now, those with no vendor, the oldest one's createdAt (null when none). */
  emergency: { openCount: number; unassignedCount: number; oldestCreatedAt: string | null };
  pastSlaCount: number;
  /** Resolved in [from, to]; averageDays 1 decimal, null when none. */
  resolution: { resolvedCount: number; averageDays: number | null };
  /** total and averageMonthly: APPROVED, non-voided linked expenses in range; pending: any date. */
  cost: { total: string; averageMonthly: string; pending: { count: number; total: string } };
}

/** GET /maintenance-tickets query. Booleans go as "true". (A type alias, so it fits apiFetch's `query`.) */
export type TicketListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  propertyId?: string;
  unitId?: string;
  priority?: MaintenancePriority;
  /** Never with unassigned. */
  vendorId?: string;
  unassigned?: boolean;
  status?: MaintenanceStatus;
  pastSla?: boolean;
  /** Inclusive UTC days on resolvedAt. */
  resolvedFrom?: string;
  resolvedTo?: string;
  includeCancelled?: boolean;
  /** Default newest. */
  sort?: "newest" | "oldest" | "priority";
};

/** GET /maintenance-tickets/summary query (default year to date; no propertyId = every ticket the caller can see). */
export type TicketSummaryQuery = {
  from?: string;
  to?: string;
  propertyId?: string;
};

/** POST /maintenance-tickets body. With a vendorId the ticket starts ASSIGNED. */
export interface TicketCreateBody {
  title: string;
  propertyId: string;
  priority: MaintenancePriority;
  description?: string;
  unitId?: string;
  locationNote?: string;
  estimatedCost?: number;
  vendorId?: string;
}

/**
 * PATCH /maintenance-tickets/:id body. Active tickets: everything but resolutionNote / vendorRating. RESOLVED: only those two.
 * null clears description, unitId, locationNote, estimatedCost, resolutionNote, vendorRating.
 */
export interface TicketUpdateBody {
  title?: string;
  propertyId?: string;
  priority?: MaintenancePriority;
  description?: string | null;
  unitId?: string | null;
  locationNote?: string | null;
  estimatedCost?: number | null;
  resolutionNote?: string | null;
  vendorRating?: number | null;
}

/** POST /maintenance-tickets/:id/resolve body (all optional). actualCost > 0 records a linked REPAIRS expense. */
export interface TicketResolveBody {
  resolutionNote?: string;
  actualCost?: number;
  /** Integer 1–5, only when the ticket has a vendor. */
  vendorRating?: number;
  reference?: string;
  paymentMethod?: PaymentMethod;
}
