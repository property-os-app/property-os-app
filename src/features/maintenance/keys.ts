import type { TicketListQuery, TicketSummaryQuery } from "@/types/maintenance";

/** TanStack Query keys for maintenance tickets. Invalidating `all` refreshes board columns, the table, vendor tabs, summaries (and the sidebar badge) and details. */
export const maintenanceKeys = {
  all: ["maintenance"] as const,
  lists: ["maintenance", "list"] as const,
  list: (query: TicketListQuery) => ["maintenance", "list", query] as const,
  summary: (query: TicketSummaryQuery) => ["maintenance", "summary", query] as const,
  detail: (id: string) => ["maintenance", "detail", id] as const,
};
