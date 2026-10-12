import { Dash, Small } from "@/components/atoms";
import { StatusBadge } from "@/components/molecules";
import { DataTable, Pagination, type Column, type DataTableProps } from "@/components/organisms";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitTypeLabels } from "@/lib/labels";
import { useClientTable } from "@/lib/useClientTable";
import { primaryTenantName, type UnitRow } from "@/features/properties/stats";

const columns: Column<UnitRow>[] = [
  {
    key: "unit",
    header: "Unit",
    cell: ({ unit }) => (
      <span>
        <span className="font-semibold">{unit.unitNumber}</span>
        <Small>
          {" "}
          · {unitTypeLabels[unit.unitType]} · {unit.floorArea.toLocaleString("en-US")} sq ft
        </Small>
      </span>
    ),
  },
  { key: "tenant", header: "Tenant", cell: ({ active }) => primaryTenantName(active) ?? <Dash /> },
  { key: "rent", header: "Rent", align: "right", cell: ({ unit, active }) => formatCurrency(active ? active.rent : unit.monthlyRent) },
  {
    key: "lease",
    header: "Lease",
    cell: ({ active, draft }) => {
      if (active) return active.endDate ? `Ends ${formatDate(active.endDate)}` : <Dash />;
      if (draft) {
        const tenant = primaryTenantName(draft);
        return tenant ? `Draft, ${tenant}` : "Draft";
      }
      return <Dash />;
    },
  },
  {
    key: "status",
    header: "Status",
    cell: ({ unit, active }) =>
      active?.endingSoon ? <StatusBadge domain="lease" status="EXPIRING" /> : <StatusBadge domain="unit" status={unit.status} />,
  },
];

type Props = Pick<DataTableProps<UnitRow>, "state" | "empty" | "error"> & { rows: UnitRow[]; caption: string };

/** Units of one property with their lease (Overview "Units needing attention" and the Units tab). 25 per page. */
export function PropertyUnitsTable({ rows, state, empty, error, caption }: Props) {
  const table = useClientTable({ rows });
  return (
    <DataTable
      columns={columns}
      rows={table.pageRows}
      rowKey={(r) => r.unit.id}
      state={state === "ideal" && rows.length === 0 ? "empty" : state}
      empty={empty}
      error={error}
      caption={caption}
      className="rounded-none border-0"
      footer={
        table.showPagination ? (
          <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
        ) : undefined
      }
    />
  );
}
