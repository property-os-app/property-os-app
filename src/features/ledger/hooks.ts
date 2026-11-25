import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, OFFLINE_MESSAGE } from "@/lib/api";
import { documentKeys } from "@/features/documents/keys";
import { isPaymentAnswer, isUnclearReply, paymentRequest } from "@/features/ledger/paymentForm";
import { leaseKeys, rentRollPrefix } from "@/features/leases/keys";
import { tenantKeys } from "@/features/tenants/keys";
import type { Charge, ChargeCreateBody, LedgerResponse, Payment, PaymentCreateBody, PaymentRecorded, VoidBody } from "@/types/ledger";

const leasePath = (id: string) => `/leases/${encodeURIComponent(id)}`;

/**
 * After any charge, payment, void or billing run: the rent roll, every lease query (lists, details, ledgers:
 * balances change) and tenants (their lease cards show balances).
 */
export function refreshAfterMoneyChange(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: rentRollPrefix });
  void qc.invalidateQueries({ queryKey: leaseKeys.all });
  void qc.invalidateQueries({ queryKey: tenantKeys.all });
}

/** GET /leases/:id/ledger: entries oldest first, voided ones included, plus the summary. Works for any lease status. */
export function useLedger(leaseId: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...ledgerQuery(leaseId), enabled: options.enabled });
}

/** The ledger query options, also for a one-off fetch (the Rent Roll's Email reminder needs the overdue amount). */
export function ledgerQuery(leaseId: string) {
  return queryOptions({
    queryKey: leaseKeys.ledger(leaseId),
    queryFn: ({ signal }) => apiFetch<LedgerResponse>(`${leasePath(leaseId)}/ledger`, { signal }),
  });
}

/** POST /leases/:id/charges. 409 on a DRAFT lease or "Rent for {month} already exists". */
export function useAddCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, body }: { leaseId: string; body: ChargeCreateBody }) =>
      apiFetch<Charge>(`${leasePath(leaseId)}/charges`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}

/**
 * POST /leases/:id/payments, with `file` as multipart (the payment and its receipt, all or nothing). Overpayment is allowed
 * (balance goes negative). 409 on a DRAFT lease. Never retried by itself. When the reply is lost or unclear
 * (`unclearPayment`), the payment may have been saved: the ledger and the rent roll reload too.
 */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    // Offline it fails at once; the default would wait and send it by itself later.
    networkMode: "always",
    mutationFn: async ({ leaseId, body, file = null, category = "" }: { leaseId: string; body: PaymentCreateBody; file?: File | null; category?: string }) => {
      const saved = await apiFetch<PaymentRecorded>(`${leasePath(leaseId)}/payments`, { method: "POST", retry: false, ...paymentRequest(body, file, category) });
      if (!isPaymentAnswer(saved)) throw new ApiError(0, [OFFLINE_MESSAGE]);
      return saved;
    },
    onSuccess: (saved) => {
      refreshAfterMoneyChange(qc);
      if (saved.document) void qc.invalidateQueries({ queryKey: documentKeys.all, predicate: (q) => q.queryKey[1] !== documentKeys.categories[1] });
    },
    onError: (err) => {
      if (unclearPayment(err)) refreshAfterMoneyChange(qc);
    },
  });
}

/** The payment may have been saved although this error came back: no answer, a 5xx, or something that isn't an API error. */
export const unclearPayment = (err: unknown) => isUnclearReply(err instanceof ApiError ? err.status : null);

/** POST /leases/:id/charges/:chargeId/void (OWNER, or a manager with money.void). 409 "Charge {number} is already voided". */
export function useVoidCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, chargeId, body }: { leaseId: string; chargeId: string; body: VoidBody }) =>
      apiFetch<Charge>(`${leasePath(leaseId)}/charges/${encodeURIComponent(chargeId)}/void`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}

/** POST /leases/:id/payments/:paymentId/void (OWNER, or a manager with money.void). 409 "Payment {number} is already voided". */
export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, paymentId, body }: { leaseId: string; paymentId: string; body: VoidBody }) =>
      apiFetch<Payment>(`${leasePath(leaseId)}/payments/${encodeURIComponent(paymentId)}/void`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}
