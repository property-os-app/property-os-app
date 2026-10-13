import { Badge, Dash, Num } from "@/components/atoms";
import { StatusBadge } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCurrency, toCents } from "@/lib/format";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { rentStatus } from "@/features/tenants/stats";
import type { Lease } from "@/types/lease";

/** The current lease badge ("Expiring" when ending soon), or a neutral "No lease". */
export function TenantLeaseBadge({ lease }: { lease: Lease | undefined }) {
  return lease ? <LeaseBadge lease={lease} /> : <Badge tone="neutral">No lease</Badge>;
}

/** "Overdue" (danger), "Due today" (warning) or "Up to date" (success) for an ACTIVE lease; Dash otherwise. */
export function RentStatusBadge({ lease }: { lease: Lease | undefined }) {
  const status = rentStatus(lease);
  if (status === null) return <Dash />;
  if (status === "overdue") return <StatusBadge domain="rent" status="OVERDUE" />;
  if (status === "today") return <Badge tone="warning">Due today</Badge>;
  return <Badge tone="success">Up to date</Badge>;
}

/** Balance of the lease: danger when owed, success "$0.00" when settled, "Credit $50.00" when negative; Dash without a lease. */
export function BalanceValue({ lease, className }: { lease: Lease | undefined; className?: string }) {
  if (!lease) return <Dash />;
  const cents = toCents(lease.balance);
  if (cents < 0) return <Num className={className}>Credit {formatCurrency(centsToAmount(-cents))}</Num>;
  return (
    <Num className={cn("font-semibold", cents > 0 ? "text-danger" : "text-success", className)}>{formatCurrency(lease.balance)}</Num>
  );
}
