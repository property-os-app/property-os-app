import { rentRollPrefix } from "@/features/leases/keys";

/** TanStack Query keys for the rent roll. `all` is the shared ["rent-roll"] prefix that lease and money changes invalidate (the year view too). */
export const rentRollKeys = {
  all: rentRollPrefix,
  month: (month: string, propertyId: string | null) => [...rentRollPrefix, month, propertyId ?? "all"] as const,
  year: (year: number, propertyId: string | null, rowsBy: "unit" | "lease" = "unit") => [...rentRollPrefix, "year", year, propertyId ?? "all", rowsBy] as const,
};
