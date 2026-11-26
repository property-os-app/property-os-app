/** A lease's signed copies among its documents. No API import, so it is unit-testable. */
import type { Document } from "@/types/document";

/** The lease document category of a signed lease (API.md, lease document categories). */
export const SIGNED_LEASE_CATEGORY = "SIGNED_LEASE";

/** The lease's own SIGNED_LEASE documents (not a payment's files), newest first. */
export function signedCopies<T extends Pick<Document, "category" | "paymentId" | "createdAt">>(docs: readonly T[]): T[] {
  return docs.filter((d) => d.category === SIGNED_LEASE_CATEGORY && d.paymentId === null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
