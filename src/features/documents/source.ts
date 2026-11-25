/** Where a listed document comes from: lease lists also have payment files, unit lists also their leases' documents. No API import, so it is unit-testable. */
import type { DocumentRef, ListedDocument } from "@/types/document";

/**
 * The record a listed document belongs to (its category list, permission and delete path): its payment, else the source
 * lease, else the list's own record.
 */
export function ownerOfDocument(doc: ListedDocument, list: DocumentRef): DocumentRef {
  const leaseId = doc.source?.leaseId ?? (list.owner === "payments" ? list.leaseId : list.owner === "leases" ? list.ownerId : null);
  if (doc.paymentId && leaseId) return { owner: "payments", ownerId: doc.paymentId, leaseId };
  if (doc.source?.type === "LEASE" && doc.source.leaseId) return { owner: "leases", ownerId: doc.source.leaseId };
  return list;
}

/**
 * "Unit", "Lease LSE-2026-021", "Lease LSE-2026-021 · Payment PMT-2026-0108" in a unit's list; "Payment PMT-2026-0108" in a
 * lease's. null when there is nothing to say (the list's own documents, and a payment's list).
 */
export function sourceText(doc: ListedDocument, list: DocumentRef): string | null {
  const payment = doc.paymentNumber && list.owner !== "payments" ? `Payment ${doc.paymentNumber}` : null;
  const record = !doc.source ? null : doc.source.type === "LEASE" ? `Lease ${doc.source.leaseNumber ?? ""}`.trim() : "Unit";
  return [record, payment].filter(Boolean).join(" · ") || null;
}
