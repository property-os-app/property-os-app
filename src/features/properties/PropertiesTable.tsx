import { Link, useNavigate } from "react-router";
import { Badge, Dash, Num, Small } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { centsToAmount, formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { propertyTypeLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import type { PropertyRow } from "@/features/properties/PropertyCard";
import type { PropertyPageState } from "@/features/properties/PropertyDetailPage";
import { formatAddress, propertyStatus } from "@/features/properties/stats";

const columns: Column<PropertyRow>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    cell: (r) => (
      <div className="flex flex-col py-2">
        <span className="font-semibold">{r.property.name}</span>
        <Small>
          {propertyTypeLabels[r.property.propertyType]} · {formatAddress(r.property)}
        </Small>
      </div>
    ),
  },
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

const fromProperties: PropertyPageState = { from: "properties" };

/** Table view of the Properties list (cards on phones). Row / card opens the detail page. */
export function PropertiesTable(props: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(r) => r.property.id}
        caption="Properties"
        renderCard={(r) => {
          const status = propertyStatus(r.counts);
          return (
            <ListCard
              href={`/properties/${r.property.id}`}
              openLabel={`Open property ${r.property.name}`}
              renderLink={(href, p) => <Link to={href} state={fromProperties} {...p} />}
              title={r.property.name}
              subtitle={formatAddress(r.property)}
              badge={<Badge tone={status.tone}>{status.label}</Badge>}
              amount={{ label: "Monthly rent", value: formatCurrency(centsToAmount(r.rentCents)) }}
              facts={[
                { label: "Units", value: <Num>{r.property.unitCount}</Num> },
                { label: "Occupancy", value: r.occupancy === null ? <Dash /> : <Num>{formatPercent(r.occupancy)}</Num> },
                { label: "Type", value: propertyTypeLabels[r.property.propertyType] },
              ]}
            />
          );
        }}
      />
    );
  }
  return (
    <DataTable
      {...props}
      columns={columns}
      rowKey={(r) => r.property.id}
      onRowClick={(r) => navigate(`/properties/${r.property.id}`, { state: fromProperties })}
      caption="Properties"
    />
  );
}
