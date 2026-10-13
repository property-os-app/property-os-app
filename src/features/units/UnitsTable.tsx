import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Dash, Num, Small } from "@/components/atoms";
import { KebabMenu, StatusBadge, type MenuItem } from "@/components/molecules";
import { DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitLayout } from "@/lib/labels";
import { primaryTenantName } from "@/features/properties/stats";
import type { UnitListRow } from "@/features/units/stats";

type Props = Pick<DataTableProps<UnitListRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (row: UnitListRow) => void;
  /** Omit to hide the Edit item (role can't edit). */
  onEdit?: (row: UnitListRow) => void;
  /** Omit to hide the Delete item (role can't delete). */
  onDelete?: (row: UnitListRow) => void;
};

/** The Units list table. Row click opens the unit drawer; the kebab has Edit and Delete when allowed. */
export function UnitsTable({ onOpen, onEdit, onDelete, ...props }: Props) {
  const columns = useMemo<Column<UnitListRow>[]>(() => {
    const cols: Column<UnitListRow>[] = [
      { key: "unit", header: "Unit", sortable: true, cell: ({ unit }) => <span className="font-semibold">Unit {unit.unitNumber}</span> },
      { key: "property", header: "Property", cell: (r) => (r.propertyName ? <Small>{r.propertyName}</Small> : <Dash />) },
      { key: "layout", header: "Layout", cell: ({ unit }) => unitLayout(unit.unitType, unit.bathrooms) },
      { key: "sqft", header: "Sq ft", align: "right", cell: ({ unit }) => <Num>{unit.floorArea.toLocaleString("en-US")}</Num> },
      { key: "listed", header: "Listed rent", align: "right", sortable: true, cell: ({ unit }) => formatCurrency(unit.monthlyRent) },
      { key: "current", header: "Current rent", align: "right", sortable: true, cell: ({ active }) => (active ? formatCurrency(active.rent) : <Dash />) },
      { key: "tenant", header: "Tenant", cell: ({ active }) => primaryTenantName(active) ?? <Dash /> },
      { key: "status", header: "Status", cell: ({ unit }) => <StatusBadge domain="unit" status={unit.status} /> },
      {
        key: "ends",
        header: "Lease ends",
        cell: ({ active }) =>
          active?.endDate ? <span className={active.endingSoon ? "font-semibold text-warning" : undefined}>{formatDate(active.endDate)}</span> : <Dash />,
      },
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
          return <KebabMenu label={`Actions for unit ${row.unit.unitNumber}`} items={items} />;
        },
      });
    }
    return cols;
  }, [onEdit, onDelete]);

  return <DataTable {...props} columns={columns} rowKey={(r) => r.unit.id} onRowClick={onOpen} caption="Units" />;
}
