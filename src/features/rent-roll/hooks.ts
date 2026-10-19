import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { refreshAfterMoneyChange } from "@/features/ledger/hooks";
import { rentRollKeys } from "@/features/rent-roll/keys";
import type { GenerateRentResponse, RentRollResponse } from "@/types/rentRoll";

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

/** POST /rent-roll/generate { month }: bills every property the user can see (not only the scope). Safe to repeat. */
export function useGenerateRent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => apiFetch<GenerateRentResponse>("/rent-roll/generate", { method: "POST", body: { month } }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}
