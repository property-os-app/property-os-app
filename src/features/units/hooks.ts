import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { unitKeys } from "@/features/units/keys";
import type { Unit } from "@/types/unit";

/** GET /units (?propertyId=): OWNER sees all, PROPERTY_MANAGER only assigned. Unknown propertyId gives []. */
export function useUnits(params: { propertyId?: string } = {}) {
  return useQuery({
    queryKey: unitKeys.list(params),
    queryFn: ({ signal }) => apiFetch<Unit[]>("/units", { query: { propertyId: params.propertyId }, signal }),
  });
}
