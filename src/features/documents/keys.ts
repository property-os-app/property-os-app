import type { DocumentRef } from "@/types/document";

/** TanStack Query keys for documents. One list per owner record. */
export const documentKeys = {
  all: ["documents"] as const,
  list: ({ owner, ownerId }: Pick<DocumentRef, "owner" | "ownerId">) => ["documents", owner, ownerId] as const,
  /** Prefix of every unit's list: they include the documents of the unit's leases and their payments, so those changes refresh them. */
  units: ["documents", "units"] as const,
  /** GET /documents/categories (the same for every record; cached for the session). */
  categories: ["documents", "categories"] as const,
};
