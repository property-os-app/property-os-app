import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { rentRollKeys } from "@/features/rent-roll/keys";
import type { RentRollResponse } from "@/types/rentRoll";

/**
 * GET /rent-roll?month=&propertyId=. Status and search are filtered on the client, so the summary,
 * the segment counts and the KPIs always describe the same rows.
 */
export function useRentRoll(month: string, propertyId: string | null) {
  return useQuery(rentRollQuery(month, propertyId));
}

/** The GET /rent-roll query options (key + fetch), shared by useRentRoll and the dashboard's several months (useQueries). */
export function rentRollQuery(month: string, propertyId: string | null) {
  return queryOptions({
    queryKey: rentRollKeys.month(month, propertyId),
    queryFn: ({ signal }) => apiFetch<RentRollResponse>("/rent-roll", { query: { month, propertyId: propertyId ?? undefined }, signal }),
  });
}
