import { queryOptions, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { rentRollKeys } from "@/features/rent-roll/keys";
import { isYearResponse } from "@/features/rent-roll/yearStats";
import type { RentRollResponse, RentRollYearResponse, RentRollYearRowsBy } from "@/types/rentRoll";

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

/**
 * GET /rent-roll/year?year=&propertyId=&rows=: one row per unit ("unit", the default) or per lease ("lease"), the 12 months
 * side by side, with property and grand totals (the same in both modes). Search and chips are filtered on the client.
 * `data` is null when the response isn't the shape this page knows (an older backend): the page says so instead of crashing.
 */
export function useRentRollYear(year: number, propertyId: string | null, rowsBy: RentRollYearRowsBy = "unit") {
  return useQuery({
    queryKey: rentRollKeys.year(year, propertyId, rowsBy),
    queryFn: ({ signal }) => apiFetch<unknown>("/rent-roll/year", { query: { year: String(year), propertyId: propertyId ?? undefined, rows: rowsBy }, signal }),
    select: (raw): RentRollYearResponse | null => (isYearResponse(raw, rowsBy) ? raw : null),
  });
}
