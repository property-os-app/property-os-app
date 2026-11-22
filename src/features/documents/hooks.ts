import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, errorText } from "@/lib/api";
import type { FileRule } from "@/lib/files";
import { documentKeys } from "@/features/documents/keys";
import { showInTab, type ViewTab } from "@/features/documents/view";
import type { Document, DocumentDownload, DocumentOwner } from "@/types/document";

const documentsPath = (owner: DocumentOwner, ownerId: string) => `/${owner}/${encodeURIComponent(ownerId)}/documents`;

/** GET /{owner}/:id/documents: newest first, no pagination. 404 when the owner is out of scope (a manager on a tenant they can't see). */
export function useDocuments(owner: DocumentOwner, ownerId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: documentKeys.list(owner, ownerId),
    queryFn: ({ signal }) => apiFetch<Document[]>(documentsPath(owner, ownerId), { signal }),
    enabled: options.enabled,
  });
}

/** POST /{owner}/:id/documents with a multipart body from `documentForm`. Refreshes that owner's list. */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, ownerId, form }: { owner: DocumentOwner; ownerId: string; form: FormData }) =>
      apiFetch<Document>(documentsPath(owner, ownerId), { method: "POST", form }),
    onSuccess: (_doc, { owner, ownerId }) => void qc.invalidateQueries({ queryKey: documentKeys.list(owner, ownerId) }),
  });
}

/** DELETE /{owner}/:id/documents/:docId. Refreshes that owner's list (a record with documents can't be deleted). */
export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ owner, ownerId, docId }: { owner: DocumentOwner; ownerId: string; docId: string }) =>
      apiFetch<Document>(`${documentsPath(owner, ownerId)}/${encodeURIComponent(docId)}`, { method: "DELETE" }),
    onSuccess: (_doc, { owner, ownerId }) => void qc.invalidateQueries({ queryKey: documentKeys.list(owner, ownerId) }),
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
