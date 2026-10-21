import { useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button, Dash, Select, Skeleton } from "@/components/atoms";
import { FormField, KpiCard, SearchInput, SegmentedControl } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCompactCurrency, formatPercent } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeases } from "@/features/leases/hooks";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { useProperties } from "@/features/properties/hooks";
import { countUnits, occupancy, sumCents } from "@/features/properties/stats";
import { useScope } from "@/features/scope/scopeContext";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { NoProperties } from "@/features/shared/NoProperties";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import { UnitDrawer } from "@/features/units/UnitDrawer";
import { UnitFormModal } from "@/features/units/UnitFormModal";
import { UnitsTable } from "@/features/units/UnitsTable";
import { useUnits } from "@/features/units/hooks";
import { buildUnitListRows, maintenanceNote, unitSearchText, type UnitListRow } from "@/features/units/stats";
import type { Unit, UnitStatus } from "@/types/unit";

type StatusFilter = "all" | UnitStatus;
type Filters = { status: StatusFilter };

const initialFilters: Filters = { status: "all" };
const statusValues: StatusFilter[] = ["all", "OCCUPIED", "VACANT", "RESERVED", "UNDER_MAINTENANCE"];

const matchFilters = (r: UnitListRow, f: Filters) => f.status === "all" || r.unit.status === f.status;

const sorts: Record<string, SortColumn<UnitListRow>> = {
  unit: { kind: "text", value: (r) => r.unit.unitNumber },
  listed: { kind: "money", value: (r) => r.unit.monthlyRent },
  current: { kind: "money", value: (r) => r.active?.rent },
};

const sortOptions: SortOption[] = [
  { key: "unit", label: "Unit", kind: "text" },
  { key: "listed", label: "Listed rent", kind: "money" },
  { key: "current", label: "Current rent", kind: "money" },
];

/** /units: KPIs, toolbar (the Property select is the sidebar scope) and the units table. Row click opens the unit drawer. */
export function UnitsPage() {
  const { me } = useAuth();
  const role = me!.role;
  const canCreate = can(role, "unit.create");
  const { propertyId: scope, setPropertyId } = useScope();
  const isMobile = useIsMobile();

  const properties = useProperties();
  const units = useUnits({ propertyId: scope ?? undefined });
  const leases = useLeases({ status: "ACTIVE", propertyId: scope ?? undefined });

  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [deleteRow, setDeleteRow] = useState<UnitListRow | null>(null);
  const addProperty = useAddPropertyFlow();

  const names = useMemo(() => new Map(properties.data?.map((p) => [p.id, p.name])), [properties.data]);
  const rows = useMemo(
    () => (units.data && leases.data ? buildUnitListRows(units.data, leases.data, names) : undefined),
    [units.data, leases.data, names],
  );
  const table = useClientTable<UnitListRow, Filters>({
    rows,
    searchText: unitSearchText,
    initialFilters,
    matchFilters,
    sorts,
    inUrl: true,
    filterValues: { status: statusValues },
  });

  const failed = [properties, units, leases].find((q) => q.isError);
  const isLoading = !failed && (properties.isPending || units.isPending || leases.isPending);
  const ready = !isLoading && !failed;
  const retry = () => {
    for (const q of [properties, units, leases]) if (q.isError) void q.refetch();
  };

  const counts = useMemo(() => countUnits(units.data ?? []), [units.data]);
  const occ = occupancy(counts);
  const vacantListedCents = useMemo(
    () => sumCents(units.data?.filter((u) => u.status === "VACANT").map((u) => u.monthlyRent) ?? []),
    [units.data],
  );
  const propertyCount = scope ? 1 : (properties.data?.length ?? 0);
  const kpi = (value: ReactNode) => (ready ? value : failed ? <Dash /> : <Skeleton className="h-10 w-24" />);

  const state: "loading" | "error" | "empty" | "ideal" = failed ? "error" : isLoading ? "loading" : table.total === 0 ? "empty" : "ideal";
  const noUnits = counts.total === 0;

  const addButton = (variant: "primary" | "secondary") =>
    canCreate ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
        Add Unit
      </Button>
    ) : undefined;

  const empty = noUnits
    ? {
        title: "No units yet",
        description: scope ? "This property has no units yet." : "Add a unit to a property to start tracking it.",
        action: addButton("secondary"),
      }
    : { title: "No units match your filters", description: "Try another search or status.", action: <Button onClick={table.clearFilters}>Clear filters</Button> };
  const error = { title: "Couldn't load units", description: failed ? errorText(failed.error) : undefined, onRetry: retry };

  const openRow = rows?.find((r) => r.unit.id === openId);

  const search = <SearchInput placeholder="Search unit, property or tenant" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />;
  const propertySelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Property"} value={scope ?? "all"} onChange={(e) => setPropertyId(e.target.value === "all" ? null : e.target.value)}>
      <option value="all">All properties</option>
      {properties.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
  const statusControl = (
    <SegmentedControl<StatusFilter>
      aria-label="Status"
      value={table.filters.status}
      onChange={(v) => table.setFilter("status", v)}
      className={isMobile ? "flex-wrap" : undefined}
      segments={[
        { value: "all", label: "All", count: counts.total },
        { value: "OCCUPIED", label: "Occupied", count: counts.OCCUPIED },
        { value: "VACANT", label: "Vacant", count: counts.VACANT },
        { value: "RESERVED", label: "Reserved", count: counts.RESERVED },
        { value: "UNDER_MAINTENANCE", label: "Maintenance", count: counts.UNDER_MAINTENANCE },
      ]}
    />
  );

  if (properties.data?.length === 0) {
    return (
      <>
        <PageHeader title="Units" />
        <NoProperties onAdd={addProperty.open} />
        {addProperty.modals}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Units"
        description={
          ready
            ? `${plural(counts.total, "unit")} across ${plural(propertyCount, "property", "properties")}. Vacant and maintenance units sort first.`
            : undefined
        }
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard label="Total units" value={kpi(counts.total)} note={ready ? plural(propertyCount, "property", "properties") : undefined} />
        <KpiCard
          label="Occupied"
          tone="success"
          value={kpi(counts.OCCUPIED)}
          delta={ready && occ !== null ? { direction: "up", label: formatPercent(occ) } : undefined}
        />
        <KpiCard
          label="Vacant"
          value={kpi(counts.VACANT)}
          delta={ready ? { direction: "down", label: `${formatCompactCurrency(centsToAmount(vacantListedCents))} / mo listed` } : undefined}
        />
        <KpiCard
          label="Under maintenance"
          tone="warning"
          value={kpi(counts.UNDER_MAINTENANCE)}
          note={ready && rows ? maintenanceNote(rows) : undefined}
        />
      </KpiRow>

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters count={table.activeFilterCount} resultCount={ready ? table.total : undefined} onClear={table.resetFilters}>
            <FormField label="Property (all pages)" htmlFor="units-property">
              {propertySelect("units-property")}
            </FormField>
            <FilterGroup label="Status">{statusControl}</FilterGroup>
            <SortSelect id="units-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {search}
          <div className="w-52">{propertySelect()}</div>
          {statusControl}
        </Toolbar>
      )}

      <div id={table.listId} className="scroll-mt-24">
        <UnitsTable
          rows={table.pageRows}
          state={state}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={empty}
          error={error}
          footer={
            table.showPagination ? (
              <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
            ) : undefined
          }
          onOpen={(r) => setOpenId(r.unit.id)}
          onEdit={can(role, "unit.edit") ? (r) => setEditUnit(r.unit) : undefined}
          onDelete={can(role, "unit.delete") ? (r) => setDeleteRow(r) : undefined}
        />
      </div>

      {openRow && <UnitDrawer unit={openRow.unit} propertyName={openRow.propertyName} onClose={() => setOpenId(null)} />}
      {formOpen && <UnitFormModal defaultPropertyId={scope} onClose={() => setFormOpen(false)} />}
      {editUnit && <UnitFormModal unit={editUnit} onClose={() => setEditUnit(null)} />}
      <UnitDeleteDialog unit={deleteRow?.unit ?? null} propertyName={deleteRow?.propertyName} onClose={() => setDeleteRow(null)} />
    </>
  );
}
