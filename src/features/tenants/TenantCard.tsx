import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar, Divider, Overline, Skeleton, Small } from "@/components/atoms";
import { Card, KebabMenu, type MenuItem } from "@/components/molecules";
import { BalanceValue, RentStatusBadge, TenantLeaseBadge } from "@/features/tenants/TenantParts";
import { rentStatus, unitLine, type TenantRow } from "@/features/tenants/stats";

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <Overline>{label}</Overline>
      {children}
    </div>
  );
}

export interface TenantCardProps {
  row: TenantRow;
  onOpen: (row: TenantRow) => void;
  /** Omit to hide the Edit item (role can't edit). */
  onEdit?: (row: TenantRow) => void;
  /** Omit to hide the Delete item (role can't delete). */
  onDelete?: (row: TenantRow) => void;
}

/**
 * Compact clickable card for the Cards view; opens the tenant drawer. The kebab stops the click from opening it.
 * Red left strip: behind on rent only (the Rent status badge says "Overdue").
 */
export function TenantCard({ row, onOpen, onEdit, onDelete }: TenantCardProps) {
  const { tenant, current } = row;
  const items: MenuItem[] = [];
  if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(row) });
  if (onDelete) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(row) });

  return (
    <Card
      padding="compact"
      role="button"
      tabIndex={0}
      aria-label={`Open ${tenant.fullName}`}
      onClick={() => onOpen(row)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen(row);
        }
      }}
      className="relative flex cursor-pointer flex-col gap-3 transition-colors duration-fast hover:border-border-strong focus-visible:focus-ring"
    >
      {rentStatus(current) === "overdue" && <span aria-hidden className="absolute -inset-y-px -left-px w-1 rounded-l-card bg-danger" />}
      <div className="flex items-start gap-3">
        <Avatar name={tenant.fullName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-text-primary">{tenant.fullName}</div>
          <Small className="block truncate">{unitLine(current) ?? "No lease"}</Small>
        </div>
        {items.length > 0 && <KebabMenu label={`Actions for ${tenant.fullName}`} items={items} />}
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <Small className="block truncate" title={tenant.email}>
          {tenant.email}
        </Small>
        <Small className="block truncate">{tenant.phone}</Small>
      </div>

      <Divider />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Lease">
          <TenantLeaseBadge lease={current} />
        </Stat>
        <Stat label="Rent status">
          <RentStatusBadge lease={current} />
        </Stat>
        <Stat label="Balance">
          <BalanceValue lease={current} />
        </Stat>
      </div>
    </Card>
  );
}

/** Loading placeholder in the shape of a TenantCard. */
export function TenantCardSkeleton() {
  return (
    <Card padding="compact" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-52" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-px" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </Card>
  );
}
