import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { refreshAfterMoneyChange } from "@/features/ledger/hooks";
import { managerKeys, propertyKeys } from "@/features/properties/keys";
import { settingsKeys } from "@/features/settings/keys";
import type { PermissionCatalogItem } from "@/types/auth";
import type { BillingRunResponse, BillingSettings } from "@/types/billing";
import type { ManagerAccess, ManagerAccessBody } from "@/types/manager";

/** GET /settings/permissions (OWNER): the permission catalog, in catalog order. It only changes with a backend release. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: settingsKeys.permissions,
    queryFn: ({ signal }) => apiFetch<PermissionCatalogItem[]>("/settings/permissions", { signal }),
    staleTime: 60 * 60_000,
  });
}

/** GET /managers/:userId/access (OWNER): the manager's permission keys and assigned property ids. */
export function useManagerAccess(userId: string) {
  return useQuery({
    queryKey: managerKeys.access(userId),
    queryFn: ({ signal }) => apiFetch<ManagerAccess>(`/managers/${encodeURIComponent(userId)}/access`, { signal }),
  });
}

/**
 * PUT /managers/:userId/access (OWNER): replaces both lists. Then refreshes every manager query (list counts, access)
 * and every property query (lists embed managers; the detail prefix covers the Property page Managers card).
 */
export function useUpdateManagerAccess(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManagerAccessBody) =>
      apiFetch<ManagerAccess>(`/managers/${encodeURIComponent(userId)}/access`, { method: "PUT", body }),
    onSuccess: (access) => {
      qc.setQueryData(managerKeys.access(userId), access);
      void qc.invalidateQueries({ queryKey: managerKeys.all });
      void qc.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/** GET /settings/billing (OWNER): { billingLeadDays }. `enabled: false` for managers (403), who don't see the lead days. */
export function useBillingSettings(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.billing,
    queryFn: ({ signal }) => apiFetch<BillingSettings>("/settings/billing", { signal }),
    enabled,
  });
}

/** PATCH /settings/billing (OWNER): a whole number 1–28 (else 400). Applies from the next run; billed charges don't move. */
export function useUpdateBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BillingSettings) => apiFetch<BillingSettings>("/settings/billing", { method: "PATCH", body }),
    onSuccess: (settings) => qc.setQueryData(settingsKeys.billing, settings),
  });
}

/** POST /settings/billing/run (OWNER, no body): today's billing at once. Safe to repeat. Balances change, so money queries refresh. */
export function useRunBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<BillingRunResponse>("/settings/billing/run", { method: "POST" }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}
