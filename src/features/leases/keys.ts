import type { LeaseStatus } from "@/types/lease";

/** TanStack Query keys for leases. */
export const leaseKeys = {
  all: ["leases"] as const,
  list: (params: { propertyId?: string; status?: LeaseStatus }) => ["leases", "list", params] as const,
};
