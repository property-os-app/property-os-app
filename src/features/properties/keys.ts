/** TanStack Query keys for properties and managers. Invalidating a prefix (e.g. propertyKeys.all) refreshes everything under it. */
export const propertyKeys = {
  all: ["properties"] as const,
  list: ["properties", "list"] as const,
  detail: (id: string) => ["properties", "detail", id] as const,
  managers: (id: string) => ["properties", "detail", id, "managers"] as const,
};

export const managerKeys = {
  /** GET /managers; also the prefix of every manager query below. */
  all: ["managers"] as const,
  access: (userId: string) => ["managers", userId, "access"] as const,
};
