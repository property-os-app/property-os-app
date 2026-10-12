import type { ReactNode } from "react";
import { Link } from "react-router";
import { Avatar, Badge, Bar, Caption, H3, Num, Overline, Skeleton, Small } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCompactCurrency, formatPercent } from "@/lib/format";
import { propertyTypeLabels } from "@/lib/labels";
import { formatAddress, propertyStatus, type UnitCounts } from "@/features/properties/stats";
import type { ManagerSummary } from "@/types/manager";
import type { Property } from "@/types/property";

/** One property with everything the list computes for it. */
export interface PropertyRow {
  property: Property;
  counts: UnitCounts;
  /** Occupancy %, null when there are no units. */
  occupancy: number | null;
  /** Monthly rent from ACTIVE leases, in cents. */
  rentCents: number;
  /** undefined while loading or when GET /properties/:id/managers failed. */
  managers: ManagerSummary[] | undefined;
}

/** Neutral block in place of the property photo (we have none), with the type badge in its top-left corner. */
export function PropertyImage({ type, className }: { type: Property["propertyType"]; className?: string }) {
  return (
    <div className={cn("relative bg-surface-2", className)}>
      <Badge tone="neutral" dot={false} className="absolute left-3 top-3 bg-surface-1">
        {propertyTypeLabels[type]}
      </Badge>
    </div>
  );
}

/** "Jordan Blake, Property Manager", "Jordan Blake +2" or a muted "No manager assigned". */
export function ManagerLine({ managers }: { managers: ManagerSummary[] | undefined }) {
  if (managers === undefined) return <Skeleton className="h-4 w-40" />;
  if (managers.length === 0) return <Caption>No manager assigned</Caption>;
  const [first] = managers;
  return (
    <span className="flex min-w-0 items-center gap-2" title={managers.map((m) => m.name).join(", ")}>
      <Avatar name={first.name} size={24} />
      <Small className="truncate">
        {managers.length === 1 ? `${first.name}, Property Manager` : `${first.name} +${managers.length - 1}`}
      </Small>
    </span>
  );
}

function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Overline>{label}</Overline>
      <Num className={cn("text-h3 font-bold text-text-primary", className)}>{value}</Num>
    </div>
  );
}

/** Clickable card for the Cards view; opens /properties/:id. */
export function PropertyCard({ row }: { row: PropertyRow }) {
  const { property, counts, occupancy, rentCents, managers } = row;
  const status = propertyStatus(counts);
  return (
    <Link to={`/properties/${property.id}`} className="group block rounded-card text-text-primary no-underline focus-visible:focus-ring">
      <Card padding="none" className="h-full transition-colors duration-fast group-hover:border-border-strong">
        <PropertyImage type={property.propertyType} className="h-40" />
        <div className="flex flex-col gap-3.5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <H3 className="truncate">{property.name}</H3>
              <Small className="block truncate">{formatAddress(property)}</Small>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Units" value={counts.total} />
            <Stat label="Occupancy" value={formatPercent(occupancy)} />
            <Stat label="Monthly rent" value={formatCompactCurrency(centsToAmount(rentCents))} className="text-success" />
            <Stat label="Vacant" value={counts.VACANT} />
          </div>
          <Bar value={occupancy ?? 0} />
          <div className="flex items-center justify-between gap-3">
            <ManagerLine managers={managers} />
            <Small className="shrink-0">
              Value <Num className="font-semibold text-text-primary">{formatCompactCurrency(property.propertyValue)}</Num>
            </Small>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** Loading placeholder in the shape of a PropertyCard. */
export function PropertyCardSkeleton() {
  return (
    <Card padding="none">
      <Skeleton className="h-40 rounded-none" />
      <div className="flex flex-col gap-3.5 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
        <Skeleton className="h-2" />
        <Skeleton className="h-4 w-40" />
      </div>
    </Card>
  );
}
