import { Dash, Num, Small } from "@/components/atoms";
import { ListCard, StatusBadge } from "@/components/molecules";
import { CardList, DataTable, Pagination, type Column, type DataTableProps } from "@/components/organisms";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitTypeLabels, unitLabel } from "@/lib/labels";
import { useClientTable } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { primaryTenantName, type UnitRow } from "@/features/properties/stats";
import { NotSet } from "@/features/shared/Missing";
import { floorAreaText } from "@/features/units/stats";

/** "Ends Mar 1, 2027", "Draft, Olivia Brown" or a dash. */
function leaseText({ active, draft }: UnitRow) {
  if (active) return active.endDate ? `Ends ${formatDate(active.endDate)}` : <Dash />;
  if (draft) {
    const tenant = primaryTenantName(draft);
    return tenant ? `Draft, ${tenant}` : "Draft";
  }
  return <Dash />;
}

/** "Expiring" when the active lease ends soon, else the unit status. */
function statusBadge({ unit, active }: UnitRow) {
  return active?.endingSoon ? <StatusBadge domain="lease" status="EXPIRING" /> : <StatusBadge domain="unit" status={unit.status} />;
}

/** "Two bedroom · 1,250 sq ft"; only the type when the floor area isn't set. */
function unitLine(unit: UnitRow["unit"]): string {
  return [unitTypeLabels[unit.unitType], floorAreaText(unit.floorArea)].filter(Boolean).join(" · ");
}

/** The active lease's rent, else the listed rent ("Not set" when null). */
function rentCell({ unit, active }: UnitRow) {
  if (active) return formatCurrency(active.rent);
  return unit.monthlyRent === null ? <NotSet /> : formatCurrency(unit.monthlyRent);
}

const columns: Column<UnitRow>[] = [
  {
    key: "unit",
    header: "Unit",
    cell: ({ unit }) => (
      <span>
        <span className="font-semibold">{unitLabel(unit.unitNumber)}</span>
        <Small>
          {" "}
          · {unitLine(unit)}
        </Small>
      </span>
    ),
  },
  { key: "tenant", header: "Tenant", cell: ({ active }) => primaryTenantName(active) ?? <Dash /> },
  { key: "rent", header: "Rent", align: "right", cell: (r) => rentCell(r) },
  { key: "lease", header: "Lease", cell: leaseText },
  { key: "status", header: "Status", cell: statusBadge },
];

type Props = Pick<DataTableProps<UnitRow>, "state" | "empty" | "error" | "onRowClick"> & { rows: UnitRow[]; caption: string };

/**
 * Units of one property with their lease (Overview "Units needing attention" and the Units tab). 25 per page.
 * Row / card opens the unit drawer. On phones: flat cards inside the parent card.
 */
export function PropertyUnitsTable({ rows, state, empty, error, caption, onRowClick }: Props) {
  const table = useClientTable({ rows });
  const isMobile = useIsMobile();
  const footer = table.showPagination ? (
    <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
  ) : undefined;
  const listState = state === "ideal" && rows.length === 0 ? "empty" : state;
  if (isMobile) {
    return (
      <CardList
        flat
        rows={table.pageRows}
        rowKey={(r) => r.unit.id}
        state={listState}
        empty={empty}
        error={error}
        caption={caption}
        footer={footer}
        renderCard={(r) => (
          <ListCard
            flat
            onOpen={onRowClick ? () => onRowClick(r) : undefined}
            openLabel={`Open ${unitLabel(r.unit.unitNumber)}`}
            title={`${unitLabel(r.unit.unitNumber)}`}
            subtitle={unitLine(r.unit)}
            badge={statusBadge(r)}
            amount={{ label: "Rent", value: <Num>{rentCell(r)}</Num> }}
            facts={[
              { label: "Tenant", value: primaryTenantName(r.active) ?? <Dash /> },
              { label: "Lease", value: leaseText(r) },
            ]}
          />
        )}
      />
    );
  }
  return (
    <DataTable
      columns={columns}
      rows={table.pageRows}
      rowKey={(r) => r.unit.id}
      onRowClick={onRowClick}
      state={listState}
      empty={empty}
      error={error}
      caption={caption}
      className="rounded-none border-0"
      footer={footer}
    />
  );
}
