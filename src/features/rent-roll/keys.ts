import { rentRollPrefix } from "@/features/leases/keys";

/** TanStack Query keys for the rent roll. `all` is the shared ["rent-roll"] prefix that lease and money changes invalidate. */
export const rentRollKeys = {
  all: rentRollPrefix,
  month: (month: string, propertyId: string | null) => [...rentRollPrefix, month, propertyId ?? "all"] as const,
};
