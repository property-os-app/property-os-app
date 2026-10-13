import type { LeaseStatus } from "@/types/lease";

export type LeaseListParams = { propertyId?: string; unitId?: string; status?: LeaseStatus };

/** TanStack Query keys for leases. */
export const leaseKeys = {
  all: ["leases"] as const,
  list: (params: LeaseListParams) => ["leases", "list", params] as const,
};
