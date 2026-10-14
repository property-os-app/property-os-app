import { primaryTenant } from "@/features/leases/stats";
import type { PaymentTarget } from "@/features/ledger/RecordPaymentModal";
import type { Lease } from "@/types/lease";

/** The one Record Payment target on the lease page: "{tenant}, Unit {n}, {property}" with the ledger summary balance. */
export function leasePaymentTarget(lease: Lease, balance: string): PaymentTarget {
  const tenant = primaryTenant(lease)?.fullName ?? "No tenant";
  return { leaseId: lease.id, label: `${tenant}, Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}`, unitNumber: lease.unit.unitNumber, balance };
}
