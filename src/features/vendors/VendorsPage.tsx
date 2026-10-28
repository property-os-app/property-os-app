import { useMemo, useState, type ReactNode } from "react";
import { Plus, SearchX, Truck } from "lucide-react";
import { Button, Checkbox, Dash, Select, Skeleton } from "@/components/atoms";
import { Card, EmptyState, FormField, InlineError, KpiCard, SearchInput, toast } from "@/components/molecules";
import { CardGrid, KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { insuranceStatusLabels, labelOptions, plural } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { useListView } from "@/features/shared/listView";
import { ViewToggle } from "@/features/shared/ViewToggle";
import { useArchiveVendor, useTradeLabel, useVendors, useVendorTrades } from "@/features/vendors/hooks";
import { VendorCard, VendorCardSkeleton } from "@/features/vendors/VendorCard";
import { ArchiveVendorDialog, DeleteVendorDialog } from "@/features/vendors/VendorConfirms";
import { VendorDrawer } from "@/features/vendors/VendorDrawer";
import { VendorFormModal } from "@/features/vendors/VendorFormModal";
import type { VendorActions } from "@/features/vendors/VendorParts";
import { VendorsTable } from "@/features/vendors/VendorsTable";
import { initialVendorFilters, matchesVendorFilters, serviceAreas, vendorKpis, vendorSearchText, type VendorFilters } from "@/features/vendors/vendorStats";
import type { Vendor, VendorInsuranceStatus } from "@/types/vendor";

const INSURANCE: VendorInsuranceStatus[] = ["EXPIRED", "EXPIRING", "VALID", "NONE"];
const insuranceOptions = labelOptions(insuranceStatusLabels).sort((a, b) => INSURANCE.indexOf(a.value) - INSURANCE.indexOf(b.value));

const sorts: Record<string, SortColumn<Vendor>> = {
  vendor: { kind: "text", value: (v) => v.name },
  expenses: { kind: "number", value: (v) => v.expenseCount },
};

const sortOptions: SortOption[] = [
  { key: "vendor", label: "Vendor", kind: "text" },
  { key: "expenses", label: "Expenses", kind: "number" },
];

/**
 * /vendors: the contractor directory (GET /vendors?includeArchived=true once; search, filters and sort on the client, in the
 * URL). Expired, then expiring insurance sorts first (server order). KPIs count the active vendors, not the filters.
 * Every write needs vendors.manage. Owner and every manager see all vendors.
 */
export function VendorsPage() {
  const { me } = useAuth();
  const user = me!;
  const canManage = can(user, "vendor.manage");

  const vendors = useVendors();
  const trades = useVendorTrades();
  const tradeLabel = useTradeLabel();
  const archive = useArchiveVendor();
  const { mutate: archiveMutate } = archive;

  const [view, setView] = useListView("vendors", "cards");
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [archiving, setArchiving] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState<Vendor | null>(null);

  const areas = useMemo(() => serviceAreas(vendors.data ?? []), [vendors.data]);
  const searchText = useMemo(() => (v: Vendor) => vendorSearchText(v, tradeLabel(v.trade)), [tradeLabel]);
  const table = useClientTable<Vendor, VendorFilters>({
    rows: vendors.data,
    searchText,
    initialFilters: initialVendorFilters,
    matchFilters: matchesVendorFilters,
    sorts,
    inUrl: true,
    filterValues: {
      trade: (v) => (v === "all" ? true : trades.data ? trades.data.some((t) => t.key === v) : undefined),
      insurance: ["all", ...INSURANCE],
      area: (v) => (v === "all" ? true : vendors.data ? areas.some((a) => a.toLowerCase() === v.toLowerCase()) : undefined),
      show: ["active", "all"],
    },
  });

  const kpis = useMemo(() => vendorKpis(vendors.data ?? []), [vendors.data]);
  const ready = vendors.isSuccess;
  const kpi = (value: ReactNode) => (ready ? value : vendors.isError ? <Dash /> : <Skeleton className="h-10 w-24" />);

  const state: "loading" | "error" | "empty" | "ideal" = vendors.isError ? "error" : vendors.isPending ? "loading" : table.total === 0 ? "empty" : "ideal";
  const noVendors = ready && vendors.data.length === 0;

  const actions = useMemo<VendorActions | undefined>(
    () =>
      canManage
        ? {
            onEdit: setEditing,
            onArchive: setArchiving,
            onDelete: setDeleting,
            onUnarchive: (v) =>
              archiveMutate(
                { id: v.id, archive: false },
                { onSuccess: (saved) => toast.success(`${saved.name} unarchived`), onError: (err) => toast.error(errorText(err)) },
              ),
          }
        : undefined,
    [canManage, archiveMutate],
  );

  const addButton = (variant: "primary" | "secondary") =>
    canManage ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
        Add Vendor
      </Button>
    ) : undefined;

  const empty = noVendors
    ? { title: "No vendors yet", description: "Add the contractors you work with to track their insurance and pick them on expenses.", action: addButton("secondary") }
    : { title: "No vendors match your filters", description: "Try another search or filter.", action: <Button onClick={table.clearFilters}>Clear filters</Button> };
  const error = { title: "Couldn't load vendors", description: vendors.isError ? errorText(vendors.error) : undefined, onRetry: () => void vendors.refetch() };
  const pagination = table.showPagination ? <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} /> : undefined;
  const openVendor = vendors.data?.find((v) => v.id === openId);

  const search = <SearchInput placeholder="Search vendor or trade" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />;
  const tradeSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Trade"} value={table.filters.trade} onChange={(e) => table.setFilter("trade", e.target.value)}>
      <option value="all">All trades</option>
      {trades.data?.map((t) => (
        <option key={t.key} value={t.key}>
          {t.label}
        </option>
      ))}
    </Select>
  );
  const insuranceSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Insurance"} value={table.filters.insurance} onChange={(e) => table.setFilter("insurance", e.target.value as VendorFilters["insurance"])}>
      <option value="all">Any insurance</option>
      {insuranceOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value === "NONE" ? "No insurance on file" : o.label}
        </option>
      ))}
    </Select>
  );
  const areaSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Service area"} value={table.filters.area} onChange={(e) => table.setFilter("area", e.target.value)}>
      <option value="all">Any service area</option>
      {areas.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </Select>
  );
  const inactiveToggle = (
    <Checkbox
      label="Show inactive"
      checked={table.filters.show === "all"}
      onChange={(e) => table.setFilter("show", e.target.checked ? "all" : "active")}
    />
  );

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Contractor directory with insurance tracking. Expiring and expired insurance sorts first."
        actions={addButton("primary")}
      />

      <KpiRow className="lg:grid-cols-3">
        <KpiCard label="Total vendors" value={kpi(kpis.total)} note={ready ? (kpis.trades === 0 ? "No trades yet" : `across ${plural(kpis.trades, "trade")}`) : undefined} />
        <KpiCard
          label="Insurance expiring"
          tone={kpis.expiring > 0 ? "warning" : "default"}
          value={kpi(kpis.expiring)}
          delta={ready && kpis.expired > 0 ? { direction: "down", label: `${kpis.expired} expired` } : undefined}
          note={ready ? "within 30 days" : undefined}
        />
        <KpiCard label="No insurance on file" value={kpi(kpis.none)} note={ready ? (kpis.none === 0 ? "Every vendor has a policy date" : "add their policy date") : undefined} />
      </KpiRow>

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters count={table.activeFilterCount} resultCount={ready ? table.total : undefined} onClear={table.resetFilters}>
            <FormField label="Trade" htmlFor="vendors-trade">
              {tradeSelect("vendors-trade")}
            </FormField>
            <FormField label="Insurance" htmlFor="vendors-insurance">
              {insuranceSelect("vendors-insurance")}
            </FormField>
            <FormField label="Service area" htmlFor="vendors-area">
              {areaSelect("vendors-area")}
            </FormField>
            <FilterGroup label="Inactive vendors">{inactiveToggle}</FilterGroup>
            <SortSelect id="vendors-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {search}
          <div className="w-44">{tradeSelect()}</div>
          <div className="w-48">{insuranceSelect()}</div>
          <div className="w-48">{areaSelect()}</div>
          {inactiveToggle}
          {table.isFiltered && (
            <Button variant="ghost" onClick={table.clearFilters}>
              Clear all
            </Button>
          )}
          <div className="flex-1" />
          {view === "cards" && <SortSelect compact id="vendors-sort-desktop" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />}
          <ViewToggle value={view} onChange={setView} />
        </Toolbar>
      )}

      <div id={table.listId} className="flex scroll-mt-24 flex-col gap-6">
        {view === "table" || isMobile ? (
          <VendorsTable
            rows={table.pageRows}
            state={state}
            sort={table.sort}
            onSortChange={table.setSort}
            empty={empty}
            error={error}
            footer={pagination}
            tradeLabel={tradeLabel}
            onOpen={(v) => setOpenId(v.id)}
            actions={actions}
          />
        ) : state === "error" ? (
          <InlineError {...error} />
        ) : state === "empty" ? (
          <Card padding="none">
            <EmptyState icon={noVendors ? <Truck strokeWidth={1.5} /> : <SearchX strokeWidth={1.5} />} {...empty} />
          </Card>
        ) : (
          <>
            <CardGrid>
              {state === "loading"
                ? Array.from({ length: 6 }).map((_, i) => <VendorCardSkeleton key={i} />)
                : table.pageRows.map((v) => <VendorCard key={v.id} vendor={v} tradeLabel={tradeLabel(v.trade)} onOpen={(x) => setOpenId(x.id)} actions={actions} />)}
            </CardGrid>
            {pagination && <div className="flex items-center justify-between text-small text-text-secondary">{pagination}</div>}
          </>
        )}
      </div>

      {openVendor && <VendorDrawer vendor={openVendor} actions={actions} onClose={() => setOpenId(null)} />}
      {formOpen && <VendorFormModal onClose={() => setFormOpen(false)} />}
      {editing && <VendorFormModal vendor={editing} onClose={() => setEditing(null)} />}
      <ArchiveVendorDialog vendor={archiving} onClose={() => setArchiving(null)} />
      <DeleteVendorDialog vendor={deleting} onClose={() => setDeleting(null)} onDeleted={() => setOpenId(null)} />
    </>
  );
}
