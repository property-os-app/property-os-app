import { useMemo, useState, type ReactNode } from "react";
import { Building2, LayoutGrid, List, Plus, SearchX } from "lucide-react";
import { Button, Select, Skeleton } from "@/components/atoms";
import { Card, EmptyState, InlineError, KpiCard, SearchInput, SegmentedControl } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCompactCurrency, formatPercent } from "@/lib/format";
import { labelOptions, plural, propertyTypeLabels } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useStoredView } from "@/lib/useStoredView";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeases } from "@/features/leases/hooks";
import { useManagers, useProperties } from "@/features/properties/hooks";
import { PropertiesTable } from "@/features/properties/PropertiesTable";
import { PropertyCard, PropertyCardSkeleton, type PropertyRow } from "@/features/properties/PropertyCard";
import { PropertyFormModal } from "@/features/properties/PropertyFormModal";
import {
  activeRentCentsByProperty,
  countUnits,
  emptyCounts,
  occupancy,
  sumCents,
  typeBreakdown,
  unitCountsByProperty,
  unitStatusNote,
} from "@/features/properties/stats";
import { useUnits } from "@/features/units/hooks";
import { UnitFormModal } from "@/features/units/UnitFormModal";

type View = "cards" | "table";
type Filters = { type: string; manager: string };

const VIEW_KEY = "propertyos.properties.view";
const VIEWS = ["cards", "table"] as const;
const initialFilters: Filters = { type: "all", manager: "all" };
const propertyTypes = Object.keys(propertyTypeLabels);

const searchText = (r: PropertyRow) => [r.property.name, r.property.street, r.property.city, r.property.state, r.property.zip];

const matchFilters = (r: PropertyRow, f: Filters) =>
  (f.type === "all" || r.property.propertyType === f.type) &&
  (f.manager === "all" || r.property.managers.some((m) => m.id === f.manager));

const sorts: Record<string, SortColumn<PropertyRow>> = {
  name: { kind: "text", value: (r) => r.property.name },
  units: { kind: "number", value: (r) => r.property.unitCount },
  occupancy: { kind: "number", value: (r) => r.occupancy },
  value: { kind: "money", value: (r) => r.property.propertyValue },
};

/**
 * /properties: KPIs, toolbar and the Cards or Table view. Ignores the sidebar property scope on purpose.
 * Unit totals and managers come with each property; GET /units is only for the counts by status (occupancy, vacant).
 */
export function PropertiesPage() {
  const { me } = useAuth();
  const role = me!.role;
  const isOwner = role === "OWNER";
  const canCreate = can(role, "property.create");

  const properties = useProperties();
  const units = useUnits();
  const leases = useLeases({ status: "ACTIVE" });
  const managers = useManagers();

  const [view, setView] = useStoredView<View>(VIEW_KEY, VIEWS, "cards");
  const [formOpen, setFormOpen] = useState(false);
  // "Add unit {index} of {total}" after creating a property with a number of units. null = no chain.
  const [chain, setChain] = useState<{ propertyId: string; index: number; total: number } | null>(null);

  const countsByProperty = useMemo(() => unitCountsByProperty(units.data ?? []), [units.data]);
  const rentByProperty = useMemo(() => activeRentCentsByProperty(leases.data ?? []), [leases.data]);
  const rows = useMemo<PropertyRow[] | undefined>(
    () =>
      properties.data?.map((property) => {
        const counts = countsByProperty.get(property.id) ?? emptyCounts;
        return {
          property,
          counts,
          occupancy: occupancy(counts),
          rentCents: rentByProperty.get(property.id) ?? 0,
        };
      }),
    [properties.data, countsByProperty, rentByProperty],
  );

  const table = useClientTable<PropertyRow, Filters>({
    rows,
    searchText,
    initialFilters,
    matchFilters,
    sorts,
    inUrl: true,
    filterValues: {
      type: propertyTypes,
      // Kept while the managers load; managers can't use this filter.
      manager: (id) => (!isOwner ? false : managers.data ? managers.data.some((m) => m.id === id) : undefined),
    },
  });

  const failed = [properties, units, leases].find((q) => q.isError);
  const isLoading = !failed && (properties.isPending || units.isPending || leases.isPending);
  const retry = () => {
    for (const q of [properties, units, leases]) if (q.isError) void q.refetch();
  };

  const allUnits = useMemo(() => countUnits(units.data ?? []), [units.data]);
  const totalUnits = useMemo(() => (properties.data ?? []).reduce((sum, p) => sum + p.unitCount, 0), [properties.data]);
  const totalValueCents = useMemo(() => sumCents(properties.data?.map((p) => p.propertyValue) ?? []), [properties.data]);
  const ready = !isLoading && !failed;
  const kpi = (value: ReactNode) => (ready ? value : <Skeleton className="h-10 w-24" />);

  const state: "loading" | "error" | "empty" | "ideal" = failed
    ? "error"
    : isLoading
      ? "loading"
      : table.total === 0
        ? "empty"
        : "ideal";
  const noProperties = (properties.data?.length ?? 0) === 0;

  const addButton = (variant: "primary" | "secondary") =>
    canCreate ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
        Add Property
      </Button>
    ) : undefined;

  const empty = noProperties
    ? isOwner
      ? { title: "No properties yet", description: "Add your first property to start tracking units and leases.", action: addButton("secondary") }
      : { title: "No properties yet", description: "No properties are assigned to you yet." }
    : {
        title: "No properties match your filters",
        description: "Try another search or filter.",
        action: <Button onClick={table.clearFilters}>Clear filters</Button>,
      };
  const error = { title: "Couldn't load properties", description: failed ? errorText(failed.error) : undefined, onRetry: retry };
  const pagination = table.showPagination ? (
    <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Properties"
        description={ready ? `${plural(properties.data?.length ?? 0, "property", "properties")}, ${plural(totalUnits, "unit")}.` : undefined}
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard label="Total properties" value={kpi(properties.data?.length ?? 0)} note={ready ? typeBreakdown(properties.data ?? []) : undefined} />
        <KpiCard label="Total units" value={kpi(totalUnits)} note={ready ? unitStatusNote(allUnits) : undefined} />
        <KpiCard
          label="Occupancy"
          value={kpi(formatPercent(occupancy(allUnits)))}
          note={ready ? `${allUnits.OCCUPIED} of ${plural(allUnits.total, "unit")}` : undefined}
        />
        <KpiCard
          label="Portfolio value"
          value={kpi(formatCompactCurrency(centsToAmount(totalValueCents)))}
          note={ready ? "Total property value" : undefined}
        />
      </KpiRow>

      <Toolbar>
        <SegmentedControl<View>
          aria-label="View"
          value={view}
          onChange={setView}
          segments={[
            { value: "cards", label: "Cards", icon: <LayoutGrid size={16} strokeWidth={1.5} /> },
            { value: "table", label: "Table", icon: <List size={16} strokeWidth={1.5} /> },
          ]}
        />
        <SearchInput placeholder="Search properties" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />
        <div className="w-44">
          <Select aria-label="Type" value={table.filters.type} onChange={(e) => table.setFilter("type", e.target.value)}>
            <option value="all">All types</option>
            {labelOptions(propertyTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        {isOwner && (
          <div className="w-52">
            <Select aria-label="Manager" value={table.filters.manager} onChange={(e) => table.setFilter("manager", e.target.value)}>
              <option value="all">All managers</option>
              {managers.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Toolbar>

      <div id={table.listId} className="flex scroll-mt-24 flex-col gap-6">
        {view === "table" ? (
          <PropertiesTable
            rows={table.pageRows}
            state={state}
            sort={table.sort}
            onSortChange={table.setSort}
            empty={empty}
            error={error}
            footer={pagination}
          />
        ) : state === "error" ? (
          <InlineError {...error} />
        ) : state === "empty" ? (
          <Card padding="none">
            <EmptyState icon={noProperties ? <Building2 strokeWidth={1.5} /> : <SearchX strokeWidth={1.5} />} {...empty} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {state === "loading"
                ? Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)
                : table.pageRows.map((row) => <PropertyCard key={row.property.id} row={row} />)}
            </div>
            {pagination && <div className="flex items-center justify-between text-small text-text-secondary">{pagination}</div>}
          </>
        )}
      </div>

      {formOpen && (
        <PropertyFormModal
          onClose={() => setFormOpen(false)}
          onCreated={(property, unitCount) => {
            if (unitCount > 0) setChain({ propertyId: property.id, index: 1, total: unitCount });
          }}
        />
      )}
      {chain && (
        <UnitFormModal
          // A new key per step gives each unit a fresh form.
          key={chain.index}
          defaultPropertyId={chain.propertyId}
          step={{ index: chain.index, total: chain.total }}
          onSaved={() => setChain((c) => (c && c.index < c.total ? { ...c, index: c.index + 1 } : null))}
          onClose={() => setChain(null)}
        />
      )}
    </>
  );
}
