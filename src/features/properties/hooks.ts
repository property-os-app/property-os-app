import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/features/auth/authContext";
import { managerKeys, propertyKeys } from "@/features/properties/keys";
import type { ManagerListItem, ManagerSummary } from "@/types/manager";
import type { Property, PropertyCreateBody, PropertyUpdateBody } from "@/types/property";

/** GET /properties: OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. Each one has unitCount and managers ({ id, name }). */
export function useProperties() {
  return useQuery({
    queryKey: propertyKeys.list,
    queryFn: ({ signal }) => apiFetch<Property[]>("/properties", { signal }),
  });
}

/** GET /properties/:id. 404 when it doesn't exist or isn't visible to this user. */
export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<Property>(`/properties/${encodeURIComponent(id)}`, { signal }),
  });
}

/** GET /properties/:id/managers, oldest assignment first. With emails (the embedded property.managers has none). */
export function usePropertyManagers(id: string) {
  return useQuery({
    queryKey: propertyKeys.managers(id),
    queryFn: ({ signal }) => apiFetch<ManagerSummary[]>(`/properties/${encodeURIComponent(id)}/managers`, { signal }),
  });
}

/** GET /managers: every PROPERTY_MANAGER with assignedPropertyCount. OWNER only, so it never runs for a manager. */
export function useManagers() {
  const { me } = useAuth();
  return useQuery({
    queryKey: managerKeys.all,
    queryFn: ({ signal }) => apiFetch<ManagerListItem[]>("/managers", { signal }),
    enabled: me?.role === "OWNER",
  });
}

/** POST /properties (OWNER, or a manager with properties.create, who is assigned to it). Refreshes the property list and the managers' property counts. */
export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PropertyCreateBody) => apiFetch<Property>("/properties", { method: "POST", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: propertyKeys.list });
      void qc.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}

/** PATCH /properties/:id (OWNER, or a manager with properties.edit). Puts the answer in the detail cache and refreshes the list. */
export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PropertyUpdateBody }) =>
      apiFetch<Property>(`/properties/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: (property) => {
      qc.setQueryData(propertyKeys.detail(property.id), property);
      void qc.invalidateQueries({ queryKey: propertyKeys.list });
    },
  });
}

/** DELETE /properties/:id (OWNER). 409 while it has units or expenses. Refreshes the list and the managers' counts. */
export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Property>(`/properties/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: (_deleted, id) => {
      // Mark the detail stale without refetching it now (the page navigates away; a later visit gets the 404).
      void qc.invalidateQueries({ queryKey: propertyKeys.detail(id), refetchType: "none" });
      void qc.invalidateQueries({ queryKey: propertyKeys.list });
      void qc.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}

/**
 * After assigning or removing a manager: the property detail (it embeds managers; the prefix also covers its managers list),
 * the property list (embeds managers too) and the managers' property counts.
 */
function refreshAfterManagerChange(qc: QueryClient, propertyId: string) {
  void qc.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
  void qc.invalidateQueries({ queryKey: propertyKeys.list });
  void qc.invalidateQueries({ queryKey: managerKeys.all });
}

/** POST /properties/:id/managers { userId } (OWNER). 400 not a manager, 409 already assigned. */
export function useAssignManager(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ManagerSummary>(`/properties/${encodeURIComponent(propertyId)}/managers`, { method: "POST", body: { userId } }),
    onSuccess: () => refreshAfterManagerChange(qc, propertyId),
  });
}

/** DELETE /properties/:id/managers/:userId (OWNER). */
export function useRemoveManager(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ManagerSummary>(`/properties/${encodeURIComponent(propertyId)}/managers/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: () => refreshAfterManagerChange(qc, propertyId),
  });
}
