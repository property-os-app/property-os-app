import { useMemo } from "react";
import { Ban, Eye, Pencil, Play, Trash2 } from "lucide-react";
import { Avatar, Caption, Dash, Num, Tag } from "@/components/atoms";
import { KebabMenu, StatusBadge, type MenuItem } from "@/components/molecules";
import { DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCurrency, formatDate, toCents } from "@/lib/format";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { coTenants, isPastEnd, primaryTenant } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

type Props = Pick<DataTableProps<Lease>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (lease: Lease) => void;
  /** Omit the next four to hide those items (role can't edit leases). */
  onEdit?: (lease: Lease) => void;
  onActivate?: (lease: Lease) => void;
  onEnd?: (lease: Lease) => void;
  onDelete?: (lease: Lease) => void;
};

/** Balance: danger when owed, "Credit {amount}" when negative. */
function Balance({ value }: { value: string }) {
  const cents = toCents(value);
  if (cents < 0) return <Num className="text-success">Credit {formatCurrency(centsToAmount(-cents))}</Num>;
  return <Num className={cn(cents > 0 && "font-semibold text-danger")}>{formatCurrency(value)}</Num>;
}

/** The Leases list table. Row click opens the lease drawer; the kebab has Open, Edit, Activate, End lease, Delete draft. */
export function LeasesTable({ onOpen, onEdit, onActivate, onEnd, onDelete, ...props }: Props) {
  const columns = useMemo<Column<Lease>[]>(
    () => [
      {
        key: "tenant",
        header: "Tenant",
        sortable: true,
        cell: (l) => {
          const primary = primaryTenant(l);
          if (!primary) return <Dash />;
          const others = coTenants(l).length;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={primary.fullName} size={24} />
              <span className="truncate font-semibold">{primary.fullName}</span>
              {others > 0 && <Caption>+{others}</Caption>}
            </span>
          );
        },
      },
      {
        key: "unit",
        header: "Unit",
        cell: (l) => (
          <div className="min-w-0">
            <div>Unit {l.unit.unitNumber}</div>
            <Caption className="block truncate">{l.unit.property.name}</Caption>
          </div>
        ),
      },
      { key: "rent", header: "Rent", align: "right", sortable: true, cell: (l) => (l.rent === null ? <Dash /> : <Num>{formatCurrency(l.rent)}</Num>) },
      { key: "term", header: "Term", cell: (l) => (l.termMonths === null ? <Dash /> : `${l.termMonths} months`) },
      { key: "status", header: "Status", cell: (l) => <LeaseBadge lease={l} /> },
      {
        key: "tags",
        header: "Tags",
        cell: (l) =>
          l.tags.length === 0 ? (
            <Dash />
          ) : (
            <span className="flex items-center gap-1.5">
              <Tag>{l.tags[0]}</Tag>
              {l.tags.length > 1 && <Caption>+{l.tags.length - 1}</Caption>}
            </span>
          ),
      },
      { key: "esign", header: "E-signature", cell: (l) => <StatusBadge domain="esign" status={l.signatureStatus} /> },
      {
        key: "expires",
        header: "Expires",
        sortable: true,
        cell: (l) =>
          l.endDate ? (
            <span className={cn(isPastEnd(l) ? "font-semibold text-danger" : l.endingSoon && "font-semibold text-warning")}>{formatDate(l.endDate)}</span>
          ) : (
            <Dash />
          ),
      },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: (l) => <Balance value={l.balance} /> },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: (l) => {
          const items: MenuItem[] = [{ label: "Open", icon: <Eye strokeWidth={1.5} />, onSelect: () => onOpen(l) }];
          if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(l) });
          if (onActivate && l.status === "DRAFT") items.push({ label: "Activate", icon: <Play strokeWidth={1.5} />, onSelect: () => onActivate(l) });
          if (onEnd && l.status === "ACTIVE") items.push({ label: "End lease", icon: <Ban strokeWidth={1.5} />, onSelect: () => onEnd(l) });
          if (onDelete && l.status === "DRAFT") {
            items.push({ label: "Delete draft", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(l) });
          }
          return <KebabMenu label={`Actions for lease ${l.leaseNumber}`} items={items} />;
        },
      },
    ],
    [onOpen, onEdit, onActivate, onEnd, onDelete],
  );

  return <DataTable {...props} columns={columns} rowKey={(l) => l.id} onRowClick={onOpen} caption="Leases" />;
}
