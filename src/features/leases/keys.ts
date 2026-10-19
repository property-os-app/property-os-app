import type { LeaseStatus } from "@/types/lease";

export type LeaseListParams = { propertyId?: string; unitId?: string; status?: LeaseStatus };

/** TanStack Query keys for leases. Invalidating `all` refreshes lists, details and tag suggestions. */
export const leaseKeys = {
  all: ["leases"] as const,
  /** Prefix of every list query. */
  lists: ["leases", "list"] as const,
  list: (params: LeaseListParams) => ["leases", "list", params] as const,
  detail: (id: string) => ["leases", "detail", id] as const,
  /** GET /leases/:id/ledger. Under ["leases"], so every lease refresh also refreshes ledgers. */
  ledger: (id: string) => ["leases", "ledger", id] as const,
  tagSuggestions: ["leases", "tag-suggestions"] as const,
};

/** Prefix of the Rent Roll queries (src/features/rent-roll). Lease, charge and payment changes invalidate it. */
export const rentRollPrefix = ["rent-roll"] as const;
