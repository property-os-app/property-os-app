import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { managerKeys, propertyKeys } from "@/features/properties/keys";
import { settingsKeys } from "@/features/settings/keys";
import type { PermissionCatalogItem } from "@/types/auth";
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
