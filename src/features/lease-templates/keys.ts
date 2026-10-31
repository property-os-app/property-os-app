/** TanStack Query keys for lease templates. Invalidating `all` refreshes lists, details, versions and merge fields. */
export const templateKeys = {
  all: ["lease-templates"] as const,
  /** Prefix of both list queries (with and without archived). */
  lists: ["lease-templates", "list"] as const,
  list: (includeArchived: boolean) => ["lease-templates", "list", { includeArchived }] as const,
  detail: (id: string) => ["lease-templates", "detail", id] as const,
  version: (id: string, version: number) => ["lease-templates", "version", id, version] as const,
  mergeFields: ["lease-templates", "merge-fields"] as const,
};
