import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { leaseKeys } from "@/features/leases/keys";
import { unitKeys } from "@/features/units/keys";
import type { Unit, UnitCreateBody, UnitUpdateBody } from "@/types/unit";

/** GET /units (?propertyId=): OWNER sees all, PROPERTY_MANAGER only assigned. Unknown propertyId gives []. */
export function useUnits(params: { propertyId?: string } = {}) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: ({ signal }) => apiFetch<Unit[]>("/units", { query: { propertyId: params.propertyId }, signal }),
  });
}

/**
 * POST /units. Adds the new unit to the cached lists right away (so the next "Add unit" in a chain
 * already sees it for the duplicate check), then refreshes them.
 */
export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UnitCreateBody) => apiFetch<Unit>("/units", { method: "POST", body }),
    onSuccess: (unit) => {
      for (const [key, list] of qc.getQueriesData<Unit[]>({ queryKey: unitKeys.lists })) {
        const params = (key[2] ?? {}) as { propertyId?: string };
        if (list && (!params.propertyId || params.propertyId === unit.propertyId)) qc.setQueryData(key, [...list, unit]);
      }
      void qc.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

/** PATCH /units/:id. Refreshes units, and leases (they embed the unit number). */
export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UnitUpdateBody }) =>
      apiFetch<Unit>(`/units/${encodeURIComponent(id)}`, { method: "PATCH", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unitKeys.all });
      void qc.invalidateQueries({ queryKey: leaseKeys.all });
    },
  });
}

/** DELETE /units/:id (OWNER). 409 while the unit has any lease or related records. */
export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Unit>(`/units/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}
