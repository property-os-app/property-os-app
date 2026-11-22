/** Types for the documents endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("Document", "DocumentDownload") and Documents (GET /documents/categories). */

/** The record a document belongs to: the first part of its path (/leases/:id/documents, ...). */
export type DocumentOwner = "leases" | "tenants" | "units" | "properties";

/** One category of an owner type: send `value`, show `label`. */
export interface DocumentCategoryOption {
  value: string;
  label: string;
}

/** GET /documents/categories: each owner type's list in display order (OTHER last). Keys are singular, unlike `DocumentOwner`. */
export interface DocumentCategories {
  lease: DocumentCategoryOption[];
  tenant: DocumentCategoryOption[];
  unit: DocumentCategoryOption[];
  property: DocumentCategoryOption[];
}

/** Detected from the file's content by the backend. */
export type DocumentContentType = "application/pdf" | "image/jpeg" | "image/png";

/** POST (201), GET list (newest first) and DELETE (the deleted one) of /{owner}/:id/documents. */
export interface Document {
  id: string;
  /** Display name; the original file name when none was given. */
  name: string;
  /** One of the owner type's category values (stored as text); show its label from GET /documents/categories. */
  category: string;
  contentType: DocumentContentType;
  sizeBytes: number;
  uploadedBy: { id: string; email: string };
  /** ISO timestamp. */
  createdAt: string;
}

/** GET /documents/:id/download: a signed link (no auth header) valid 5 minutes. Open it right away; never store it. */
export interface DocumentDownload {
  url: string;
  /** ISO timestamp, 5 minutes ahead. */
  expiresAt: string;
}
