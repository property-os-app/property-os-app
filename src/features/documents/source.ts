/** A unit's list also has its leases' documents. No API import, so it is unit-testable. */
import type { DocumentOwner, ListedDocument } from "@/types/document";

export interface DocumentOwnerRef {
  owner: DocumentOwner;
  ownerId: string;
}

/** The record a listed document belongs to (its category list, permission and delete path): the source lease, else the list's own record. */
export function ownerOfDocument(doc: ListedDocument, list: DocumentOwnerRef): DocumentOwnerRef {
  return doc.source?.type === "LEASE" && doc.source.leaseId ? { owner: "leases", ownerId: doc.source.leaseId } : list;
}

/** "Unit" or "Lease LSE-2026-021"; null when the list has no sources. */
export function sourceText(doc: ListedDocument): string | null {
  if (!doc.source) return null;
  return doc.source.type === "LEASE" ? `Lease ${doc.source.leaseNumber ?? ""}`.trim() : "Unit";
}
