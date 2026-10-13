import { Caption, H2, Overline } from "@/components/atoms";
import { Card, StatusBadge } from "@/components/molecules";
import { cn } from "@/lib/cn";
import type { Lease } from "@/types/lease";

/** Lease badge: "Expiring" (warning) for an ACTIVE lease ending soon, else the lease status. */
export function LeaseBadge({ lease }: { lease: Lease }) {
  return <StatusBadge domain="lease" status={lease.endingSoon ? "EXPIRING" : lease.status} />;
}

/** Small stat card for drawers: Overline label, H2 tabular value, Caption note. */
export function StatCard({ label, value, note, className }: { label: string; value: string; note: string; className?: string }) {
  return (
    <Card padding="compact" className="flex flex-col gap-1">
      <Overline>{label}</Overline>
      <H2 as="div" className={cn("tabular", className)}>
        {value}
      </H2>
      <Caption>{note}</Caption>
    </Card>
  );
}
