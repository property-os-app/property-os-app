import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { leaseKeys } from "@/features/leases/keys";
import { tenantKeys } from "@/features/tenants/keys";
import type { Tenant, TenantCreateBody, TenantDetail, TenantListItem, TenantUpdateBody } from "@/types/tenant";

/** GET /tenants: every tenant for OWNER and managers (not scoped, on purpose). Newest first. Search and filters run on the client. */
export function useTenants() {
  return useQuery({
    queryKey: tenantKeys.list,
    queryFn: ({ signal }) => apiFetch<TenantListItem[]>("/tenants", { signal }),
  });
}

/** GET /tenants/:id: with idNumber and createdBy. 404 when it doesn't exist. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<TenantDetail>(`/tenants/${encodeURIComponent(id)}`, { signal }),
  });
}

/** POST /tenants. The answer has no createdBy, so the list is refetched. 409 on a duplicate email. */
export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantCreateBody) => apiFetch<Tenant>("/tenants", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

/** PATCH /tenants/:id. The answer has no createdBy: refetches the list and detail, and leases (they embed name and email). */
export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TenantUpdateBody }) =>
      apiFetch<Tenant>(`/tenants/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: tenantKeys.all });
      void qc.invalidateQueries({ queryKey: leaseKeys.all });
    },
  });
}

/** DELETE /tenants/:id (OWNER, or a manager with tenants.delete). 409 while the tenant is on any lease. */
export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Tenant>(`/tenants/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: (_deleted, id) => {
      // The drawer closes; don't refetch the deleted detail now (it would 404).
      qc.removeQueries({ queryKey: tenantKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: tenantKeys.list });
    },
  });
}
