/** Types for the documents endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md sections 2 and 4 ("Document", "DocumentDownload"). */

/** The record a document belongs to: the first part of its path (/leases/:id/documents, ...). */
export type DocumentOwner = "leases" | "tenants" | "units" | "properties";

export type LeaseDocumentCategory = "SIGNED_LEASE" | "RENEWAL" | "ADDENDUM" | "INSPECTION" | "NOTICE" | "OTHER";
export type TenantDocumentCategory = "ID" | "APPLICATION" | "OTHER";
export type UnitDocumentCategory = "INSPECTION" | "PHOTO" | "OTHER";
export type PropertyDocumentCategory = "OWNERSHIP" | "INSURANCE" | "TAX" | "OTHER";

/** The categories each owner type accepts (API.md section 2); anything else is 400. */
export interface DocumentCategoryByOwner {
  leases: LeaseDocumentCategory;
  tenants: TenantDocumentCategory;
  units: UnitDocumentCategory;
  properties: PropertyDocumentCategory;
}

export type DocumentCategory = DocumentCategoryByOwner[DocumentOwner];

/** Detected from the file's content by the backend. */
export type DocumentContentType = "application/pdf" | "image/jpeg" | "image/png";

/** POST (201), GET list (newest first) and DELETE (the deleted one) of /{owner}/:id/documents. */
export interface Document {
  id: string;
  /** Display name; the original file name when none was given. */
  name: string;
  /** One of the owner type's categories (stored as text). */
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
