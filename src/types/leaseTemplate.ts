/** Types for the lease template endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("LeaseTemplate…", "MergeField") and section 5 ("Lease templates"). */

/** GET /lease-templates (one row). */
export interface LeaseTemplateListItem {
  id: string;
  /** Unique, ignoring case. */
  name: string;
  description: string | null;
  /** 1–120; a hint to prefill a new lease's end date. The server never applies it. */
  defaultTermMonths: number | null;
  /** At most one template is the default. */
  isDefault: boolean;
  /** ISO timestamp; null = active. */
  archivedAt: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp; also changes when a new version is saved. */
  updatedAt: string;
  /** Highest version number. */
  currentVersion: number;
  /** Leases pinned to any of its versions (delete needs 0). */
  leaseCount: number;
}

/** One entry of a template's version history (newest first). */
export interface LeaseTemplateVersionSummary {
  id: string;
  /** 1, 2, 3… per template. */
  version: number;
  /** ISO timestamp. */
  createdAt: string;
  createdBy: { id: string; name: string };
  /** Leases pinned to this version. */
  leaseCount: number;
}

/** GET /lease-templates/:id and every template write. */
export interface LeaseTemplateDetail extends LeaseTemplateListItem {
  currentVersionId: string;
  /** Markdown of the current version. */
  body: string;
  /** Newest first. */
  versions: LeaseTemplateVersionSummary[];
}

/** GET /lease-templates/:id/versions/:version. Versions never change once saved. */
export interface LeaseTemplateVersion extends LeaseTemplateVersionSummary {
  templateId: string;
  body: string;
}

/** GET /lease-templates/merge-fields (menu order). */
export interface MergeField {
  /** What goes inside {{ }}, e.g. "lease.rent". */
  key: string;
  /** Menu group, e.g. "Lease". */
  group: string;
  label: string;
  /** The value previews print, e.g. "$1,200.00". */
  sample: string;
}

/** POST /lease-templates body. Never send null on isDefault. */
export interface LeaseTemplateCreateBody {
  name: string;
  description?: string | null;
  defaultTermMonths?: number | null;
  /** Markdown, 1–50,000 characters after trimming. No HTML. */
  body: string;
  isDefault?: boolean;
}

/** PATCH /lease-templates/:id body: details only (body gives 400; use POST …/versions). null clears description and defaultTermMonths. */
export interface LeaseTemplateUpdateBody {
  name?: string;
  description?: string | null;
  defaultTermMonths?: number | null;
}
