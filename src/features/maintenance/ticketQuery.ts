/** The Maintenance page filters and the GET /maintenance-tickets queries built from them: board columns and table (unit-tested). */
import type { SortState } from "@/components/organisms";
import type { MaintenancePriority, MaintenanceStatus, TicketList, TicketListQuery, TicketSummaryQuery } from "@/types/maintenance";

export const PRIORITIES: MaintenancePriority[] = ["EMERGENCY", "URGENT", "NORMAL", "LOW"];
export const TICKET_STATUSES: MaintenanceStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CANCELLED"];

/** The Assignee filter's "no vendor" value. */
export const UNASSIGNED = "unassigned";

/** URL filter values. "all" / "0" are the defaults (left out of the URL). `status` and `cancelled` apply to the Table view only. */
export type TicketFilters = {
  priority: "all" | MaintenancePriority;
  /** "all", UNASSIGNED or a vendor id. */
  assignee: string;
  /** "1": active tickets past their SLA only. */
  pastSla: "0" | "1";
  status: "all" | MaintenanceStatus;
  cancelled: "0" | "1";
};

export const initialTicketFilters: TicketFilters = { priority: "all", assignee: "all", pastSla: "0", status: "all", cancelled: "0" };

/** The Table view's sortable columns: Created (newest / oldest) and Priority. */
export const TICKET_SORT_KEYS = ["created", "priority"] as const;
export const DEFAULT_TICKET_SORT: SortState = { key: "created", direction: "desc" };
export const TICKET_PAGE_SIZE = 25;
/** The API's largest page: one request per board column. */
export const BOARD_PAGE_SIZE = 100;

/** Allowed URL values per filter. The assignee is checked against the vendors once loaded. */
export function ticketFilterValues(vendorIds?: string[]) {
  return {
    priority: PRIORITIES,
    assignee: (v: string) => (v === UNASSIGNED ? true : vendorIds ? vendorIds.includes(v) : undefined),
    pastSla: ["0", "1"],
    status: TICKET_STATUSES,
    cancelled: ["0", "1"],
  };
}

/** Filters the user changed (search not counted): the phone "Filters" count. Board: status and cancelled don't apply. */
export function activeTicketFilterCount(f: TicketFilters, view: "board" | "table"): number {
  const keys = view === "board" ? (["priority", "assignee", "pastSla"] as const) : (["priority", "assignee", "pastSla", "status", "cancelled"] as const);
  return keys.filter((k) => f[k] !== initialTicketFilters[k]).length;
}

export interface TicketQueryInput {
  /** The saved (debounced) search. */
  search: string;
  filters: TicketFilters;
  /** The sidebar scope: a property id, or null for every property. */
  scope: string | null;
}

/** The filters both views share: search, property, priority, assignee, past SLA. */
function sharedQuery({ search, filters: f, scope }: TicketQueryInput): Omit<TicketListQuery, "page" | "pageSize"> {
  const q: Omit<TicketListQuery, "page" | "pageSize"> = {};
  const s = search.trim();
  if (s) q.search = s;
  if (scope) q.propertyId = scope;
  if (f.priority !== "all") q.priority = f.priority;
  if (f.assignee === UNASSIGNED) q.unassigned = true;
  else if (f.assignee !== "all") q.vendorId = f.assignee;
  if (f.pastSla === "1") q.pastSla = true;
  return q;
}

/** The four board columns, in order. Resolved shows this week only. */
export const BOARD_COLUMNS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

/**
 * One board column's request: that status, the first 100. Open columns sort by priority (EMERGENCY first, oldest first
 * within one); Resolved is newest first and only from `weekStart` (resolvedFrom).
 */
export function boardColumnQuery(column: BoardColumn, input: TicketQueryInput, weekStart: string): TicketListQuery {
  const q: TicketListQuery = { page: 1, pageSize: BOARD_PAGE_SIZE, ...sharedQuery(input), status: column };
  if (column === "RESOLVED") q.resolvedFrom = weekStart;
  else q.sort = "priority";
  return q;
}

/** Table sort -> the API's `sort`: Created newest (default, left out) or oldest; Priority (one direction only). */
export function sortParam(sort: SortState): TicketListQuery["sort"] {
  if (sort?.key === "priority") return "priority";
  if (sort?.key === "created" && sort.direction === "asc") return "oldest";
  return undefined;
}

/** The Table view's request: shared filters plus status, include cancelled, sort and page. */
export function tableQuery(input: TicketQueryInput & { sort: SortState; page: number; pageSize?: number }): TicketListQuery {
  const { filters: f } = input;
  const q: TicketListQuery = { page: input.page, pageSize: input.pageSize ?? TICKET_PAGE_SIZE, ...sharedQuery(input) };
  if (f.status !== "all") q.status = f.status;
  if (f.cancelled === "1" && f.status === "all") q.includeCancelled = true;
  const sort = sortParam(input.sort);
  if (sort) q.sort = sort;
  return q;
}

/** GET /maintenance-tickets/summary for the page and dashboard: the scope only (default year to date). */
export function ticketSummaryQuery(scope: string | null): TicketSummaryQuery {
  return scope ? { propertyId: scope } : {};
}

/**
 * Column counts. Open, Assigned and In progress come from the Open column's statusCounts (the same filters, status
 * ignored); Resolved is the Resolved column's totalItems (statusCounts there would also apply resolvedFrom to every status).
 * A column without an answer yet is undefined.
 */
export function boardCounts(open: TicketList | undefined, resolved: TicketList | undefined): Partial<Record<BoardColumn, number>> {
  return {
    OPEN: open?.statusCounts.OPEN,
    ASSIGNED: open?.statusCounts.ASSIGNED,
    IN_PROGRESS: open?.statusCounts.IN_PROGRESS,
    RESOLVED: resolved?.totalItems,
  };
}
