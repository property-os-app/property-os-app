import type { DocumentOwner } from "@/types/document";

/** TanStack Query keys for documents. One list per owner record. */
export const documentKeys = {
  all: ["documents"] as const,
  list: (owner: DocumentOwner, ownerId: string) => ["documents", owner, ownerId] as const,
};
