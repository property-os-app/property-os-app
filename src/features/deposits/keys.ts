/** TanStack Query keys for deposits and end previews. Under ["leases"], so every lease or money refresh also refreshes them. */
export const depositKeys = {
  /** GET /leases/:id/deposit. */
  deposit: (leaseId: string) => ["leases", "deposit", leaseId] as const,
  /** GET /leases/:id/end-preview (?endedOn=); "" = the lease's own end (already ended) or a cancel. */
  endPreview: (leaseId: string, endedOn: string) => ["leases", "end-preview", leaseId, endedOn] as const,
};
