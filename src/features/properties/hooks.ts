import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Property } from "@/types/property";

/** Query keys for properties, so every list shares one cache entry. */
export const propertyKeys = {
  all: ["properties"] as const,
};

/** GET /properties: OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. */
export function useProperties() {
  return useQuery({
    queryKey: propertyKeys.all,
    queryFn: ({ signal }) => apiFetch<Property[]>("/properties", { signal }),
  });
}
