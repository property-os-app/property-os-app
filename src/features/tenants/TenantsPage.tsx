import { useMemo, useState, type ReactNode } from "react";
import { Plus, SearchX, Users } from "lucide-react";
import { Button, Dash, Select, Skeleton } from "@/components/atoms";
import { Card, EmptyState, FilterChip, FormField, InlineError, KpiCard, SearchInput } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCompactCurrency, formatPercent } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeases } from "@/features/leases/hooks";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { useListView } from "@/features/shared/listView";
import { ViewToggle } from "@/features/shared/ViewToggle";
import { useTenants } from "@/features/tenants/hooks";
import { TenantCard, TenantCardSkeleton } from "@/features/tenants/TenantCard";
import { TenantDeleteDialog } from "@/features/tenants/TenantDeleteDialog";
import { TenantDrawer } from "@/features/tenants/TenantDrawer";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { TenantsTable } from "@/features/tenants/TenantsTable";
import {
  activeLeaseCount,
  buildTenantRows,
  hasBalance,
  matchesLeaseFilter,
  movedInThisQuarter,
  outstanding,
  recentMoveOuts,
  tenantSearchText,
  type LeaseFilter,
  type TenantRow,
} from "@/features/tenants/stats";

type Filters = { lease: LeaseFilter; balance: "any" | "owed" };

const initialFilters: Filters = { lease: "all", balance: "any" };

const leaseFilterOptions: { value: LeaseFilter; label: string }[] = [
  { value: "all", label: "All leases" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring" },
  { value: "draft", label: "Draft" },
  { value: "ended", label: "Ended" },
  { value: "none", label: "No lease" },
];

const matchFilters = (r: TenantRow, f: Filters) => matchesLeaseFilter(r, f.lease) && (f.balance === "any" || hasBalance(r));

const sorts: Record<string, SortColumn<TenantRow>> = {
  tenant: { kind: "text", value: (r) => r.tenant.fullName },
  balance: { kind: "money", value: (r) => r.current?.balance },
};

const sortOptions: SortOption[] = [
  { key: "tenant", label: "Tenant", kind: "text" },
  { key: "balance", label: "Balance", kind: "money" },
];

/**
 * /tenants: one directory of every tenant (GET /tenants is not scoped), with lease data from GET /leases (scoped:
 * a manager sees "No lease" for tenants without a lease on an assigned property). The Property select is the sidebar scope.
 */
export function TenantsPage() {
  const { me } = useAuth();
  const user = me!;
  const canCreate = can(user, "tenant.create");
  const { propertyId: scope, setPropertyId } = useScope();

  const tenants = useTenants();
  const leases = useLeases();
  const properties = useProperties();

  const [view, setView] = useListView("tenants", "cards");
  // Phones always get the list cards; the saved Cards / Table choice is kept for wider screens.
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<TenantRow | null>(null);

  const allRows = useMemo(
    () => (tenants.data && leases.data ? buildTenantRows(tenants.data, leases.data) : undefined),
    [tenants.data, leases.data],
  );
  // The scope filters before the table, so "Clear filters" never resets it.
  const scopedRows = useMemo(
    () => (scope ? allRows?.filter((r) => r.current?.unit.property.id === scope) : allRows),
    [allRows, scope],
  );
  const table = useClientTable<TenantRow, Filters>({
    rows: scopedRows,
    searchText: tenantSearchText,
    initialFilters,
    matchFilters,
    sorts,
    inUrl: true,
    filterValues: { lease: leaseFilterOptions.map((o) => o.value), balance: ["any", "owed"] },
  });

  const failed = [tenants, leases].find((q) => q.isError);
  const isLoading = !failed && (tenants.isPending || leases.isPending);
  const ready = !isLoading && !failed;
  const retry = () => {
    for (const q of [tenants, leases]) if (q.isError) void q.refetch();
  };

  // KPIs count the whole directory, not the scope or the filters.
  const { total, movedIn, withActive, owed, movedOut } = useMemo(() => {
    const rows = allRows ?? [];
    return {
      total: rows.length,
      movedIn: movedInThisQuarter(rows),
      withActive: activeLeaseCount(rows),
      owed: outstanding(rows),
      movedOut: recentMoveOuts(rows),
    };
  }, [allRows]);
  const balanceCount = useMemo(() => (scopedRows ?? []).filter(hasBalance).length, [scopedRows]);
  const kpi = (value: ReactNode) => (ready ? value : failed ? <Dash /> : <Skeleton className="h-10 w-24" />);

  const state: "loading" | "error" | "empty" | "ideal" = failed ? "error" : isLoading ? "loading" : table.total === 0 ? "empty" : "ideal";
  const noTenants = total === 0;
  const scopeEmpty = !noTenants && (scopedRows?.length ?? 0) === 0;

  const addButton = (variant: "primary" | "secondary") =>
    canCreate ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setFormOpen(true)}>
        Add Tenant
      </Button>
    ) : undefined;

  const empty = noTenants
    ? { title: "No tenants yet", description: "Add a tenant to put them on a lease.", action: addButton("secondary") }
    : scopeEmpty
      ? { title: "No tenants on this property", description: "No tenant has a lease on this property yet. Choose All properties to see everyone." }
      : {
          title: "No tenants match your filters",
          description: "Try another search or filter.",
          action: <Button onClick={table.clearFilters}>Clear filters</Button>,
        };
  const error = { title: "Couldn't load tenants", description: failed ? errorText(failed.error) : undefined, onRetry: retry };
  const pagination = table.showPagination ? (
    <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
  ) : undefined;

  const onOpen = (r: TenantRow) => setOpenId(r.tenant.id);
  const onEdit = can(user, "tenant.edit") ? (r: TenantRow) => setEditId(r.tenant.id) : undefined;
  const onDelete = can(user, "tenant.delete") ? (r: TenantRow) => setDeleteRow(r) : undefined;
  const openRow = allRows?.find((r) => r.tenant.id === openId);
  const balanceOn = table.filters.balance === "owed";

  const search = <SearchInput placeholder="Search name, unit, phone, email" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />;
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
  const leaseSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Lease status"} value={table.filters.lease} onChange={(e) => table.setFilter("lease", e.target.value as LeaseFilter)}>
      {leaseFilterOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
  const balanceChip = (
    <FilterChip
      active={balanceOn}
      aria-pressed={balanceOn}
      count={ready ? balanceCount : undefined}
      countTone={balanceCount > 0 ? "danger" : "neutral"}
      onClick={() => table.setFilter("balance", balanceOn ? "any" : "owed")}
      onRemove={() => table.setFilter("balance", "any")}
      className={isMobile ? "min-h-11 px-4" : undefined}
    >
      Has balance
    </FilterChip>
  );

  return (
    <>
      <PageHeader
        title="Tenants"
        description={ready ? `${plural(total, "tenant")}. Outstanding balances sort first.` : undefined}
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard
          label="Total tenants"
          value={kpi(total)}
          delta={ready && movedIn > 0 ? { direction: "up", label: String(movedIn) } : undefined}
          note={ready ? (movedIn > 0 ? "moved in this quarter" : "No move-ins this quarter") : undefined}
        />
        <KpiCard
          label="With active lease"
          tone="success"
          value={kpi(withActive)}
          delta={ready && total > 0 ? { direction: "up", label: formatPercent((withActive / total) * 100) } : undefined}
        />
        <KpiCard
          label="Outstanding balances"
          tone="danger"
          value={kpi(owed.count)}
          delta={ready ? { direction: "down", label: formatCompactCurrency(centsToAmount(owed.totalCents)) } : undefined}
          note={ready ? "total" : undefined}
        />
        <KpiCard label="Recent move-outs" value={kpi(movedOut)} note={ready ? "last 30 days" : undefined} />
      </KpiRow>

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters
            count={table.activeFilterCount}
            resultCount={ready ? table.total : undefined}
            onClear={table.resetFilters}
          >
            <FormField label="Property (all pages)" htmlFor="tenants-property">
              {propertySelect("tenants-property")}
            </FormField>
            <FormField label="Lease status" htmlFor="tenants-lease">
              {leaseSelect("tenants-lease")}
            </FormField>
            <FilterGroup label="Balance">
              <div>{balanceChip}</div>
            </FilterGroup>
            <SortSelect id="tenants-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {search}
          <div className="w-52">{propertySelect()}</div>
          <div className="w-44">{leaseSelect()}</div>
          {balanceChip}
          <div className="flex-1" />
          {view === "cards" && <SortSelect compact id="tenants-sort-desktop" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />}
          <ViewToggle value={view} onChange={setView} />
        </Toolbar>
      )}

      <div id={table.listId} className="flex scroll-mt-24 flex-col gap-6">
        {view === "table" || isMobile ? (
          <TenantsTable
            rows={table.pageRows}
            state={state}
            sort={table.sort}
            onSortChange={table.setSort}
            empty={empty}
            error={error}
            footer={pagination}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : state === "error" ? (
          <InlineError {...error} />
        ) : state === "empty" ? (
          <Card padding="none">
            <EmptyState icon={noTenants ? <Users strokeWidth={1.5} /> : <SearchX strokeWidth={1.5} />} {...empty} />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {state === "loading"
                ? Array.from({ length: 6 }).map((_, i) => <TenantCardSkeleton key={i} />)
                : table.pageRows.map((row) => (
                    <TenantCard key={row.tenant.id} row={row} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
                  ))}
            </div>
            {pagination && <div className="flex items-center justify-between text-small text-text-secondary">{pagination}</div>}
          </>
        )}
      </div>

      {openRow && <TenantDrawer row={openRow} onClose={() => setOpenId(null)} />}
      {formOpen && <TenantFormModal onClose={() => setFormOpen(false)} />}
      {editId && <TenantFormModal tenantId={editId} onClose={() => setEditId(null)} />}
      <TenantDeleteDialog tenant={deleteRow?.tenant ?? null} onClose={() => setDeleteRow(null)} />
    </>
  );
}
