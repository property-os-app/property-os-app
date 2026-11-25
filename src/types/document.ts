/** Types for the documents endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("Document", "DocumentDownload") and Documents (GET /documents/categories). */

/** The kind of record a document belongs to. A payment's documents are also documents of its lease. */
export type DocumentOwner = "leases" | "tenants" | "units" | "properties" | "payments";

/** One record with documents: its path is /{owner}/:ownerId/documents, or /leases/:leaseId/payments/:ownerId/documents. */
export type DocumentRef = { owner: Exclude<DocumentOwner, "payments">; ownerId: string } | { owner: "payments"; ownerId: string; leaseId: string };

/** One category of an owner type: send `value`, show `label`. */
export interface DocumentCategoryOption {
  value: string;
  label: string;
}

/** GET /documents/categories: each owner type's list, and the payments' one, in display order (OTHER last). Keys are singular, unlike `DocumentOwner`. */
export interface DocumentCategories {
  lease: DocumentCategoryOption[];
  tenant: DocumentCategoryOption[];
  unit: DocumentCategoryOption[];
  property: DocumentCategoryOption[];
  payment: DocumentCategoryOption[];
}

/** Detected from the file's content by the backend. */
export type DocumentContentType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "image/heic"
  | "image/heif"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.oasis.opendocument.text"
  | "application/vnd.oasis.opendocument.spreadsheet"
  | "text/csv"
  | "text/plain"
  | "application/rtf";

/** POST (201), GET list (newest first) and DELETE (the deleted one) of /{owner}/:id/documents. */
export interface Document {
  id: string;
  /** Display name; the original file name when none was given. */
  name: string;
  /** One of the owner type's category values, or of the payment ones when `paymentId` is set (stored as text); show its label from GET /documents/categories. */
  category: string;
  contentType: DocumentContentType;
  sizeBytes: number;
  uploadedBy: { id: string; email: string };
  /** ISO timestamp. */
  createdAt: string;
  /** The payment ("PMT-YYYY-NNNN") a lease's document belongs to; both null on every other document. */
  paymentId: string | null;
  paymentNumber: string | null;
}

/** Where a row of a unit's list comes from: the unit itself, or one of its leases. */
export interface DocumentSource {
  type: "UNIT" | "LEASE";
  /** Both null for UNIT. */
  leaseId: string | null;
  leaseNumber: string | null;
}

/** One listed document; `source` only in a unit's list (GET /units/:id/documents?includeLeases=true). */
export interface ListedDocument extends Document {
  source?: DocumentSource;
}

/** GET /documents/:id/download: a signed link (no auth header) valid 5 minutes. Open it right away; never store it. */
export interface DocumentDownload {
  url: string;
  /** ISO timestamp, 5 minutes ahead. */
  expiresAt: string;
}
