import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, errorText } from "@/lib/api";
import type { FileRule } from "@/lib/files";
import { documentKeys } from "@/features/documents/keys";
import { showInTab, type ViewTab } from "@/features/documents/view";
import type { Document, DocumentCategories, DocumentDownload, DocumentOwner, ListedDocument } from "@/types/document";

const documentsPath = (owner: DocumentOwner, ownerId: string) => `/${owner}/${encodeURIComponent(ownerId)}/documents`;

/**
 * GET /documents/categories: `{ lease, tenant, unit, property }`, each `{ value, label }[]` in display order. Static data
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
 * GET /{owner}/:id/documents: newest first, no pagination. A unit's list includes its leases' documents (includeLeases=true), each
 * with its `source`. 404 when the owner is out of scope (a manager on a tenant they can't see).
 */
export function useDocuments(owner: DocumentOwner, ownerId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: documentKeys.list(owner, ownerId),
    queryFn: ({ signal }) => apiFetch<ListedDocument[]>(documentsPath(owner, ownerId), { query: { includeLeases: owner === "units" ? "true" : undefined }, signal }),
    enabled: options.enabled,
  });
}

/** Refreshes that owner's list; a lease's documents are in its unit's list too. */
function refreshDocuments(qc: QueryClient, owner: DocumentOwner, ownerId: string) {
  void qc.invalidateQueries({ queryKey: documentKeys.list(owner, ownerId) });
  if (owner === "leases") void qc.invalidateQueries({ queryKey: documentKeys.units });
}

/** POST /{owner}/:id/documents with a multipart body from `documentForm`. Refreshes that owner's list. */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, ownerId, form }: { owner: DocumentOwner; ownerId: string; form: FormData }) =>
      apiFetch<Document>(documentsPath(owner, ownerId), { method: "POST", form }),
    onSuccess: (_doc, { owner, ownerId }) => refreshDocuments(qc, owner, ownerId),
  });
}

/** DELETE /{owner}/:id/documents/:docId. Refreshes that owner's list (a record with documents can't be deleted). */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, ownerId, docId }: { owner: DocumentOwner; ownerId: string; docId: string }) =>
      apiFetch<Document>(`${documentsPath(owner, ownerId)}/${encodeURIComponent(docId)}`, { method: "DELETE" }),
    onSuccess: (_doc, { owner, ownerId }) => refreshDocuments(qc, owner, ownerId),
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
