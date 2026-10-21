import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Dash, Num, Small } from "@/components/atoms";
import { KebabMenu, ListCard, StatusBadge, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitLayout } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { primaryTenantName } from "@/features/properties/stats";
import type { UnitListRow } from "@/features/units/stats";

type Props = Pick<DataTableProps<UnitListRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (row: UnitListRow) => void;
  /** Omit to hide the Edit item (role can't edit). */
  onEdit?: (row: UnitListRow) => void;
  /** Omit to hide the Delete item (role can't delete). */
  onDelete?: (row: UnitListRow) => void;
};

/** Lease end date, amber when ending soon. */
function EndsText({ active }: { active: UnitListRow["active"] }) {
  return active?.endDate ? <span className={active.endingSoon ? "font-semibold text-warning" : undefined}>{formatDate(active.endDate)}</span> : <Dash />;
}

/** The Units list: a table from md up, cards on phones. Row / card opens the unit drawer; the kebab has Edit and Delete when allowed. */
export function UnitsTable({ onOpen, onEdit, onDelete, ...props }: Props) {
  const isMobile = useIsMobile();
  const menu = useMemo(
    () =>
      onEdit || onDelete
        ? (row: UnitListRow) => {
            const items: MenuItem[] = [];
            if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(row) });
            if (onDelete) items.push({ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(row) });
            return <KebabMenu label={`Actions for unit ${row.unit.unitNumber}`} items={items} />;
          }
        : null,
    [onEdit, onDelete],
  );

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
        cell: ({ active }) => <EndsText active={active} />,
      },
    ];
    if (menu) cols.push({ key: "actions", header: <span className="sr-only">Actions</span>, width: 56, cell: menu });
    return cols;
  }, [menu]);

  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(r) => r.unit.id}
        caption="Units"
        renderCard={(r) => (
          <ListCard
            onOpen={() => onOpen(r)}
            openLabel={`Open unit ${r.unit.unitNumber}${r.propertyName ? `, ${r.propertyName}` : ""}`}
            title={`Unit ${r.unit.unitNumber}`}
            subtitle={[r.propertyName, unitLayout(r.unit.unitType, r.unit.bathrooms)].filter(Boolean).join(" · ")}
            badge={<StatusBadge domain="unit" status={r.unit.status} />}
            amount={{ label: "Current rent", value: r.active ? formatCurrency(r.active.rent) : <Dash /> }}
            facts={[
              { label: "Tenant", value: primaryTenantName(r.active) ?? <Dash /> },
              { label: "Lease ends", value: <EndsText active={r.active} /> },
              { label: "Listed rent", value: <Num>{formatCurrency(r.unit.monthlyRent)}</Num> },
            ]}
            actions={menu?.(r)}
          />
        )}
      />
    );
  }

  return <DataTable {...props} columns={columns} rowKey={(r) => r.unit.id} onRowClick={onOpen} caption="Units" />;
}
