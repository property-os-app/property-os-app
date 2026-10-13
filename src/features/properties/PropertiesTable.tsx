import { useNavigate } from "react-router";
import { Dash, Num, Small } from "@/components/atoms";
import { DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { centsToAmount, formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { propertyTypeLabels } from "@/lib/labels";
import type { PropertyRow } from "@/features/properties/PropertyCard";
import { formatAddress } from "@/features/properties/stats";

const columns: Column<PropertyRow>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    cell: (r) => (
      <div className="flex flex-col py-2">
        <span className="font-semibold">{r.property.name}</span>
        <Small>{formatAddress(r.property)}</Small>
      </div>
    ),
  },
  { key: "type", header: "Type", cell: (r) => propertyTypeLabels[r.property.propertyType] },
  { key: "units", header: "Units", sortable: true, cell: (r) => <Num>{r.property.unitCount}</Num> },
  { key: "occupancy", header: "Occupancy", sortable: true, cell: (r) => (r.occupancy === null ? <Dash /> : <Num>{formatPercent(r.occupancy)}</Num>) },
  { key: "rent", header: "Monthly rent", align: "right", cell: (r) => formatCurrency(centsToAmount(r.rentCents)) },
  {
    key: "managers",
    header: "Managers",
    cell: (r) =>
      r.property.managers.length === 0 ? (
        <Dash />
      ) : (
        <span className="whitespace-normal">{r.property.managers.map((m) => m.name).join(", ")}</span>
      ),
  },
  { key: "value", header: "Value", align: "right", sortable: true, cell: (r) => formatCompactCurrency(r.property.propertyValue) },
];

type Props = Pick<DataTableProps<PropertyRow>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer">;

/** Table view of the Properties list. Row click opens the detail page. */
export function PropertiesTable(props: Props) {
  const navigate = useNavigate();
  return (
    <DataTable
      {...props}
      columns={columns}
      rowKey={(r) => r.property.id}
      onRowClick={(r) => navigate(`/properties/${r.property.id}`)}
      caption="Properties"
    />
  );
}
