import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/features/auth/authContext";
import { managerKeys, propertyKeys } from "@/features/properties/keys";
import type { ManagerListItem, ManagerSummary } from "@/types/manager";
import type { Property, PropertyCreateBody, PropertyUpdateBody } from "@/types/property";

/** GET /properties: OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. */
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

function fetchPropertyManagers(id: string, signal: AbortSignal) {
  return apiFetch<ManagerSummary[]>(`/properties/${encodeURIComponent(id)}/managers`, { signal });
}

/** GET /properties/:id/managers, oldest assignment first. */
export function usePropertyManagers(id: string) {
  return useQuery({
    queryKey: propertyKeys.managers(id),
    queryFn: ({ signal }) => fetchPropertyManagers(id, signal),
  });
}

/**
 * GET /properties/:id/managers for each property (one request per property; fine for a small list).
 * Returns a map propertyId -> managers (missing while loading or on error) and the overall state.
 */
export function usePropertyManagersMap(propertyIds: string[]) {
  return useQueries({
    queries: propertyIds.map((id) => ({
      queryKey: propertyKeys.managers(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchPropertyManagers(id, signal),
    })),
    combine: (results) => {
      const byProperty = new Map<string, ManagerSummary[]>();
      results.forEach((r, i) => {
        if (r.data) byProperty.set(propertyIds[i], r.data);
      });
      return { byProperty, isPending: results.some((r) => r.isPending), isError: results.some((r) => r.isError) };
    },
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

/** POST /properties (OWNER). Refreshes the property list and the managers' property counts. */
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

/** PATCH /properties/:id (OWNER). Puts the answer in the detail cache and refreshes the list. */
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

/** POST /properties/:id/managers { userId } (OWNER). 400 not a manager, 409 already assigned. */
export function useAssignManager(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ManagerSummary>(`/properties/${encodeURIComponent(propertyId)}/managers`, { method: "POST", body: { userId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: propertyKeys.managers(propertyId) });
      void qc.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}

/** DELETE /properties/:id/managers/:userId (OWNER). */
export function useRemoveManager(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<ManagerSummary>(`/properties/${encodeURIComponent(propertyId)}/managers/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: propertyKeys.managers(propertyId) });
      void qc.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}
