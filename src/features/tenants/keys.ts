/** TanStack Query keys for tenants. Invalidating `all` refreshes the list and every detail. */
export const tenantKeys = {
  all: ["tenants"] as const,
  list: ["tenants", "list"] as const,
  detail: (id: string) => ["tenants", "detail", id] as const,
};
