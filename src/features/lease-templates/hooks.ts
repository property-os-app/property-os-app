import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchBlob, type ApiBlob } from "@/lib/api";
import { leaseKeys } from "@/features/leases/keys";
import { templateKeys } from "@/features/lease-templates/keys";
import type {
  LeaseTemplateCreateBody,
  LeaseTemplateDetail,
  LeaseTemplateListItem,
  LeaseTemplateUpdateBody,
  LeaseTemplateVersion,
  MergeField,
} from "@/types/leaseTemplate";

const templatePath = (id: string) => `/lease-templates/${encodeURIComponent(id)}`;

/** GET /lease-templates (Owner and every manager): the default first, then name A→Z. Archived ones only with `includeArchived`. */
export function useLeaseTemplates({ includeArchived = false, enabled }: { includeArchived?: boolean; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: templateKeys.list(includeArchived),
    queryFn: ({ signal }) =>
      apiFetch<LeaseTemplateListItem[]>("/lease-templates", { query: { includeArchived: includeArchived ? "true" : undefined }, signal }),
    enabled,
  });
}

/** GET /lease-templates/:id: current body and version history (newest first), archived or not. */
export function useLeaseTemplate(id: string | undefined) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ""),
    queryFn: ({ signal }) => apiFetch<LeaseTemplateDetail>(templatePath(id!), { signal }),
    enabled: Boolean(id),
  });
}

/** GET /lease-templates/:id/versions/:version: one saved version with its body. Versions never change, so it is kept forever. */
export function useTemplateVersion(id: string, version: number | null) {
  return useQuery({
    queryKey: templateKeys.version(id, version ?? 0),
    queryFn: ({ signal }) => apiFetch<LeaseTemplateVersion>(`${templatePath(id)}/versions/${version}`, { signal }),
    enabled: version !== null,
    staleTime: Infinity,
  });
}

/** GET /lease-templates/merge-fields: the "Insert field" catalog, in menu order. It only changes with a backend release. */
export function useMergeFields() {
  return useQuery({
    queryKey: templateKeys.mergeFields,
    queryFn: ({ signal }) => apiFetch<MergeField[]>("/lease-templates/merge-fields", { signal }),
    staleTime: 60 * 60_000,
  });
}

/** After a template write: the saved detail goes into the cache, lists refresh, and leases refresh (they embed the name and archived flag). */
function refreshAfterTemplateChange(qc: QueryClient, saved: LeaseTemplateDetail) {
  qc.setQueryData(templateKeys.detail(saved.id), saved);
  void qc.invalidateQueries({ queryKey: templateKeys.lists });
  void qc.invalidateQueries({ queryKey: leaseKeys.all });
}

/** POST /lease-templates (templates.manage): the template and its version 1. */
export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeaseTemplateCreateBody) => apiFetch<LeaseTemplateDetail>("/lease-templates", { method: "POST", body }),
    onSuccess: (saved) => refreshAfterTemplateChange(qc, saved),
  });
}

/** PATCH /lease-templates/:id (templates.manage): name, description, default term. Never creates a version. */
export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: LeaseTemplateUpdateBody }) =>
      apiFetch<LeaseTemplateDetail>(templatePath(id), { method: "PATCH", body }),
    onSuccess: (saved) => refreshAfterTemplateChange(qc, saved),
  });
}

/** POST /lease-templates/:id/versions (templates.manage): saves the next version (or nothing when the body is the same). */
export function useCreateTemplateVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      apiFetch<LeaseTemplateDetail>(`${templatePath(id)}/versions`, { method: "POST", body: { body } }),
    onSuccess: (saved) => refreshAfterTemplateChange(qc, saved),
  });
}

/** POST /lease-templates/:id/archive or /unarchive (templates.manage). Archiving also clears isDefault. */
export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      apiFetch<LeaseTemplateDetail>(`${templatePath(id)}/${archive ? "archive" : "unarchive"}`, { method: "POST" }),
    onSuccess: (saved) => refreshAfterTemplateChange(qc, saved),
  });
}

/** POST (make default, replaces the old one) or DELETE (no default left) /lease-templates/:id/default (templates.manage). */
export function useSetDefaultTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) =>
      apiFetch<LeaseTemplateDetail>(`${templatePath(id)}/default`, { method: isDefault ? "POST" : "DELETE" }),
    onSuccess: (saved) => refreshAfterTemplateChange(qc, saved),
  });
}

/** DELETE /lease-templates/:id (templates.manage): only while no lease uses it (409 otherwise). */
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<LeaseTemplateDetail>(templatePath(id), { method: "DELETE" }),
    onSuccess: (deleted) => {
      qc.removeQueries({ queryKey: templateKeys.detail(deleted.id) });
      void qc.invalidateQueries({ queryKey: templateKeys.lists });
    },
  });
}

/**
 * The PDF preview of a template: an unsaved body (`{ body }`, POST /lease-templates/preview, templates.manage) or a saved
 * version (`{ id, version }`, GET /lease-templates/:id/preview, anyone). Sample data, SAMPLE watermark. A mutation, so it runs
 * only when asked and a FORBIDDEN_PERMISSION reloads /auth/me like other writes.
 */
export function useTemplatePreviewPdf() {
  return useMutation({
    mutationFn: (source: { body: string } | { id: string; version?: number; download?: boolean }): Promise<ApiBlob> =>
      "body" in source
        ? apiFetchBlob("/lease-templates/preview", { method: "POST", body: { body: source.body } })
        : apiFetchBlob(`${templatePath(source.id)}/preview`, {
            query: { version: source.version, download: source.download ? "true" : undefined },
          }),
  });
}
