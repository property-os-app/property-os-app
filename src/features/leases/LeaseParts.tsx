import { Badge } from "@/components/atoms";
import { StatusBadge } from "@/components/molecules";
import type { Lease } from "@/types/lease";

/**
 * Lease badge: neutral "Old lease" for a history-only lease, neutral "Cancelled" for one cancelled before it started,
 * "Expiring" (warning) for an ACTIVE lease ending soon, else the lease status.
 */
export function LeaseBadge({ lease }: { lease: Lease }) {
  if (lease.isHistorical) return <Badge tone="neutral">Old lease</Badge>;
  return <StatusBadge domain="lease" status={lease.cancelledOn ? "CANCELLED" : lease.endingSoon ? "EXPIRING" : lease.status} />;
}

