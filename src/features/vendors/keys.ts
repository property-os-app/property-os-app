/** TanStack Query keys for vendors. Invalidating `all` refreshes the list and every detail. */
export const vendorKeys = {
  all: ["vendors"] as const,
  /** GET /vendors?includeArchived=true: the one list query (the page filters on the client). */
  list: ["vendors", "list"] as const,
  detail: (id: string) => ["vendors", "detail", id] as const,
  /** Outside `all`: the catalog never changes with a vendor. */
  trades: ["vendor-trades"] as const,
};
