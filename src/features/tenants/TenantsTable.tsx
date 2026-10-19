import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar, Caption, Dash, Small } from "@/components/atoms";
import { KebabMenu, type MenuItem } from "@/components/molecules";
import { DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { BalanceValue, RentStatusBadge, TenantLeaseBadge } from "@/features/tenants/TenantParts";
import type { TenantRow } from "@/features/tenants/stats";

type Props = Pick<DataTableProps<TenantRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (row: TenantRow) => void;
  /** Omit to hide the Edit item (role can't edit). */
  onEdit?: (row: TenantRow) => void;
  /** Omit to hide the Delete item (role can't delete). */
  onDelete?: (row: TenantRow) => void;
};

/** The Table view of the tenants directory. Row click opens the tenant drawer; Tenant and Balance sort. */
export function TenantsTable({ onOpen, onEdit, onDelete, ...props }: Props) {
  const columns = useMemo<Column<TenantRow>[]>(() => {
    const cols: Column<TenantRow>[] = [
      {
        key: "tenant",
        header: "Tenant",
        sortable: true,
        cell: ({ tenant }) => (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={tenant.fullName} size={24} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{tenant.fullName}</div>
              <Caption className="block max-w-64 truncate">{tenant.email}</Caption>
            </div>
          </div>
        ),
      },
      { key: "phone", header: "Phone", cell: ({ tenant }) => <Small>{tenant.phone}</Small> },
      {
        key: "unit",
        header: "Unit",
        cell: ({ current }) =>
          current ? (
            <div className="min-w-0">
              <div>Unit {current.unit.unitNumber}</div>
              <Caption className="block truncate">{current.unit.property.name}</Caption>
            </div>
          ) : (
            <Dash />
          ),
      },
      { key: "lease", header: "Lease", cell: ({ current }) => <TenantLeaseBadge lease={current} /> },
      { key: "rentStatus", header: "Rent status", cell: ({ current }) => <RentStatusBadge lease={current} /> },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: ({ current }) => <BalanceValue lease={current} /> },
    ];
    if (onEdit || onDelete) {
      cols.push({
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: (row) => {
          const items: MenuItem[] = [];
          if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(row) });
          if (onDelete) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(row) });
          return <KebabMenu label={`Actions for ${row.tenant.fullName}`} items={items} />;
        },
      });
    }
    return cols;
  }, [onEdit, onDelete]);

  return <DataTable {...props} columns={columns} rowKey={(r) => r.tenant.id} onRowClick={onOpen} caption="Tenants" />;
}
