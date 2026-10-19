/** TanStack Query keys for units. */
export const unitKeys = {
  all: ["units"] as const,
  /** Prefix of every list query. */
  lists: ["units", "list"] as const,
  list: (params: { propertyId?: string }) => ["units", "list", params] as const,
};
