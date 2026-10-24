import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/molecules";
import { ApiError, apiFetch, apiFetchBlob, errorText, type ApiBlob } from "@/lib/api";
import { friendlyLeaseMessage, parseMissingMessage } from "@/features/leases/stats";
import { leaseKeys, rentRollPrefix, type LeaseListParams } from "@/features/leases/keys";
import { tenantKeys } from "@/features/tenants/keys";
import { unitKeys } from "@/features/units/keys";
import type { Lease, LeaseCreateBody, LeaseEndBody, LeaseUpdateBody } from "@/types/lease";

const leasePath = (id: string) => `/leases/${encodeURIComponent(id)}`;

/** GET /leases (?propertyId=&unitId=&status=): OWNER sees all, PROPERTY_MANAGER only assigned. Newest first. */
export function useLeases(params: LeaseListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: leaseKeys.list(params),
    queryFn: ({ signal }) =>
      apiFetch<Lease[]>("/leases", { query: { propertyId: params.propertyId, unitId: params.unitId, status: params.status }, signal }),
    enabled: options.enabled,
  });
}

/** GET /leases/:id. `placeholder` (the list row) shows right away while the detail loads. 404 when gone or not visible. */
export function useLease(id: string, placeholder?: Lease) {
  return useQuery({
    queryKey: leaseKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<Lease>(leasePath(id), { signal }),
    placeholderData: placeholder,
  });
}

/** GET /leases/tag-suggestions: the 6 default tags, then the tags used on visible leases (A→Z). */
export function useTagSuggestions() {
  return useQuery({
    queryKey: leaseKeys.tagSuggestions,
    queryFn: ({ signal }) => apiFetch<string[]>("/leases/tag-suggestions", { signal }),
  });
}

/**
 * GET /leases/:id/document: the lease as a PDF from its pinned template version (anyone who can read the lease).
 * `download` asks for an attachment named "{leaseNumber}.pdf". 409 when the lease has no template. A mutation, so it runs only on a click.
 */
export function useLeaseDocument() {
  return useMutation({
    mutationFn: ({ id, download }: { id: string; download: boolean }): Promise<ApiBlob> =>
      apiFetchBlob(`${leasePath(id)}/document`, { query: { download: download ? "true" : undefined } }),
  });
}

/** After any lease change: leases, units (status follows activate / end), tenants (their lease cards) and the rent roll. */
function refreshAfterLeaseChange(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: leaseKeys.all });
  void qc.invalidateQueries({ queryKey: unitKeys.all });
  void qc.invalidateQueries({ queryKey: tenantKeys.all });
  void qc.invalidateQueries({ queryKey: rentRollPrefix });
}

/** POST /leases: a DRAFT (only unitId needed) or, with status "ACTIVE", created and activated in one call. */
export function useCreateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeaseCreateBody) => apiFetch<Lease>("/leases", { method: "POST", body }),
    onSuccess: () => refreshAfterLeaseChange(qc),
  });
}

/** PATCH /leases/:id (never status). On an ACTIVE lease the backend re-runs the activation checks. */
export function useUpdateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: LeaseUpdateBody }) => apiFetch<Lease>(leasePath(id), { method: "PATCH", body }),
    onSuccess: () => refreshAfterLeaseChange(qc),
  });
}

/** POST /leases/:id/activate. 400 "Cannot activate lease: missing ...", 409 on overlapping dates. The unit becomes OCCUPIED. */
export function useActivateLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Lease>(`${leasePath(id)}/activate`, { method: "POST" }),
    onSuccess: () => refreshAfterLeaseChange(qc),
  });
}

/** POST /leases/:id/end { status: ENDED | TERMINATED }. The unit becomes VACANT unless it has another ACTIVE lease. */
export function useEndLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: LeaseEndBody }) => apiFetch<Lease>(`${leasePath(id)}/end`, { method: "POST", body }),
    onSuccess: () => refreshAfterLeaseChange(qc),
  });
}

/** DELETE /leases/:id: DRAFT only (409 otherwise). Drops the detail from the cache so the closing drawer doesn't refetch a 404. */
export function useDeleteLease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Lease>(leasePath(id), { method: "DELETE" }),
    onSuccess: (_deleted, id) => {
      qc.removeQueries({ queryKey: leaseKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: leaseKeys.lists });
      void qc.invalidateQueries({ queryKey: leaseKeys.tagSuggestions });
      void qc.invalidateQueries({ queryKey: unitKeys.all });
      void qc.invalidateQueries({ queryKey: tenantKeys.all });
      void qc.invalidateQueries({ queryKey: rentRollPrefix });
    },
  });
}

/** errorText for lease saves: backend messages that list lease fields get friendly names (friendlyLeaseMessage). */
export function leaseErrorText(err: unknown): string {
  return err instanceof ApiError && err.messages.length > 0 ? err.messages.map(friendlyLeaseMessage).join(" ") : errorText(err);
}

/** Why activation failed, ready for an InlineError. `fixable`: the user can fix it in the wizard ("Edit lease" button). */
export interface ActivateError {
  title: string;
  description?: string;
  fixable: boolean;
}

/** 400 "Cannot activate lease: missing ..." -> friendly field names; 400 end date and 409 overlap -> their message. */
export function activateErrorOf(err: unknown): ActivateError {
  const messages = err instanceof ApiError ? err.messages : [];
  const missing = messages.map(parseMissingMessage).find((m) => m !== null);
  if (missing) return { title: "Can't activate yet", description: `Missing: ${missing.join(", ")}.`, fixable: true };
  const fixable = err instanceof ApiError && (err.status === 400 || messages.some((m) => m.includes("overlapping")));
  return { title: "Couldn't activate the lease", description: errorText(err), fixable };
}

/**
 * Activate with the success toast ("Lease LSE-2026-001 activated. Unit 4B is now occupied.").
 * `run` resolves to null on success, or the ActivateError to show.
 */
export function useActivateAction() {
  const activate = useActivateLease();
  const run = async (id: string): Promise<ActivateError | null> => {
    try {
      const saved = await activate.mutateAsync(id);
      toast.success(`Lease ${saved.leaseNumber} activated. Unit ${saved.unit.unitNumber} is now occupied.`);
      return null;
    } catch (err) {
      return activateErrorOf(err);
    }
  };
  return { run, isPending: activate.isPending };
}
