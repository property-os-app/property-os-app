import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { rentRollKeys } from "@/features/rent-roll/keys";
import type { RentRollResponse, RentRollYearResponse } from "@/types/rentRoll";

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

/** GET /rent-roll/year?year=&propertyId=&rows=unit: one row per unit, the 12 months side by side, with property and grand totals. Search and chips are filtered on the client. */
export function useRentRollYear(year: number, propertyId: string | null) {
  return useQuery({
    queryKey: rentRollKeys.year(year, propertyId),
    queryFn: ({ signal }) =>
      apiFetch<RentRollYearResponse>("/rent-roll/year", { query: { year: String(year), propertyId: propertyId ?? undefined, rows: "unit" }, signal }),
  });
}
