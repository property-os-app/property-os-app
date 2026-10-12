import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { leaseKeys } from "@/features/leases/keys";
import type { Lease, LeaseStatus } from "@/types/lease";

/** GET /leases (?propertyId=&status=): OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. */
export function useLeases(params: { propertyId?: string; status?: LeaseStatus } = {}) {
  return useQuery({
    queryKey: leaseKeys.list(params),
    queryFn: ({ signal }) => apiFetch<Lease[]>("/leases", { query: { propertyId: params.propertyId, status: params.status }, signal }),
  });
}
