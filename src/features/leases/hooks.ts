import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { leaseKeys, type LeaseListParams } from "@/features/leases/keys";
import type { Lease } from "@/types/lease";

/** GET /leases (?propertyId=&unitId=&status=): OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. */
export function useLeases(params: LeaseListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: leaseKeys.list(params),
    queryFn: ({ signal }) =>
      apiFetch<Lease[]>("/leases", { query: { propertyId: params.propertyId, unitId: params.unitId, status: params.status }, signal }),
    enabled: options.enabled,
  });
}
