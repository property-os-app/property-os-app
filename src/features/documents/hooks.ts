import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, errorText } from "@/lib/api";
import type { FileRule } from "@/lib/files";
import { documentKeys } from "@/features/documents/keys";
import { leaseKeys } from "@/features/leases/keys";
import { showInTab, type ViewTab } from "@/features/documents/view";
import type { Document, DocumentCategories, DocumentDownload, DocumentRef, ListedDocument } from "@/types/document";

const documentsPath = (target: DocumentRef) =>
  target.owner === "payments"
    ? `/leases/${encodeURIComponent(target.leaseId)}/payments/${encodeURIComponent(target.ownerId)}/documents`
    : `/${target.owner}/${encodeURIComponent(target.ownerId)}/documents`;

/** A lease's list has its payments' files too, a unit's list its leases' documents and their payments' files. */
const LIST_QUERY: Partial<Record<DocumentRef["owner"], Record<string, string>>> = {
  leases: { includePayments: "true" },
  units: { includeLeases: "true", includePayments: "true" },
};

/**
 * GET /documents/categories: `{ lease, tenant, unit, property, payment }`, each `{ value, label }[]` in display order. Static data
 * (changes only with an API release), so it is fetched once and kept for the session. Read it with `categories.ts`.
 */
export function useDocumentCategories() {
  return useQuery({
    queryKey: documentKeys.categories,
    queryFn: ({ signal }) => apiFetch<DocumentCategories>("/documents/categories", { signal }),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * GET /{owner}/:id/documents (a payment's: under its lease): newest first, no pagination. A lease's list includes its payments'
 * files (`paymentId` set), a unit's list its leases' documents and theirs, each with its `source`. 404 when the owner is out of scope (a manager on a tenant they can't see).
 */
export function useDocuments(target: DocumentRef, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: documentKeys.list(target),
    queryFn: ({ signal }) => apiFetch<ListedDocument[]>(documentsPath(target), { query: LIST_QUERY[target.owner], signal }),
    enabled: options.enabled,
  });
}

/** Refreshes that record's list. A lease's documents are in its unit's list too; a payment's also in its lease's, and counted in the ledger. */
function refreshDocuments(qc: QueryClient, target: DocumentRef) {
  void qc.invalidateQueries({ queryKey: documentKeys.list(target) });
  if (target.owner === "leases" || target.owner === "payments") void qc.invalidateQueries({ queryKey: documentKeys.units });
  if (target.owner === "payments") {
    void qc.invalidateQueries({ queryKey: documentKeys.list({ owner: "leases", ownerId: target.leaseId }) });
    void qc.invalidateQueries({ queryKey: leaseKeys.ledger(target.leaseId) });
  }
}

/** POST /{owner}/:id/documents with a multipart body from `documentForm`. Refreshes that owner's list. */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ target, form }: { target: DocumentRef; form: FormData }) => apiFetch<Document>(documentsPath(target), { method: "POST", form }),
    onSuccess: (_doc, { target }) => refreshDocuments(qc, target),
  });
}

/** DELETE /{owner}/:id/documents/:docId. Refreshes that owner's list (a record with documents can't be deleted). */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ target, docId }: { target: DocumentRef; docId: string }) =>
      apiFetch<Document>(`${documentsPath(target)}/${encodeURIComponent(docId)}`, { method: "DELETE" }),
    onSuccess: (_doc, { target }) => refreshDocuments(qc, target),
  });
}

/**
 * GET /documents/:id/download on the click, then `window.location.assign(url)`: the signed link is an attachment, so the
 * browser saves the file under its original name and the page stays. The link (valid 5 minutes) is never stored.
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: (docId: string) => apiFetch<DocumentDownload>(`/documents/${encodeURIComponent(docId)}/download`),
    onSuccess: ({ url }) => window.location.assign(url),
  });
}

/** An upload error for the form: 413 names the limit ("File too large (max 20 MB)."); everything else is the backend message. */
export function uploadErrorText(err: unknown, rule: FileRule): string {
  if (err instanceof ApiError && err.status === 413) return `File too large (max ${rule.maxText}).`;
  return errorText(err);
}

/**
 * View: the caller opens the blank tab on the click (`openBlankTab`, before any await, so popup blockers allow it) and
 * passes it here; this asks for a fresh inline link (GET /documents/:id/download?inline=true) and points the tab at it.
 * On failure the tab is closed and the error reaches `onError`. The link is never stored.
 */
export function useViewDocument() {
  return useMutation({
    mutationFn: ({ docId, tab }: { docId: string; tab: ViewTab }) => showInTab(tab, docId),
  });
}
