import { useMemo, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Badge, Button, Dash, Select, Skeleton } from "@/components/atoms";
import { FormField, KpiCard, SearchInput, SegmentedControl } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { centsToAmount, formatCompactCurrency } from "@/lib/format";
import { plural, signatureStatusLabels } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useActivateAction, useLeases } from "@/features/leases/hooks";
import { LeaseDeleteDialog } from "@/features/leases/LeaseDeleteDialog";
import { LeaseEndModal } from "@/features/leases/LeaseEndModal";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeasesTable } from "@/features/leases/LeasesTable";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { compareLeasesDefault, expiresWithin, isClosed, isPastEnd, pastEndNote, primaryTenant, startedThisMonth } from "@/features/leases/stats";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { useProperties } from "@/features/properties/hooks";
import { sumCents } from "@/features/properties/stats";
import { useScope } from "@/features/scope/scopeContext";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { NoProperties } from "@/features/shared/NoProperties";
import type { Lease, SignatureStatus } from "@/types/lease";

type StatusFilter = "all" | "active" | "expiring" | "draft" | "ended";
type Filters = { status: StatusFilter; esign: "all" | SignatureStatus };

const initialFilters: Filters = { status: "all", esign: "all" };
const statusValues: StatusFilter[] = ["all", "active", "expiring", "draft", "ended"];
const esignValues: Filters["esign"][] = ["all", "NOT_SENT", "PENDING", "SIGNED"];

function matchStatus(l: Lease, status: StatusFilter): boolean {
  switch (status) {
    case "all":
      return true;
    case "active":
      return l.status === "ACTIVE";
    case "expiring":
      return l.status === "ACTIVE" && l.endingSoon;
    case "draft":
      return l.status === "DRAFT";
    case "ended":
      return isClosed(l);
  }
}

const matchFilters = (l: Lease, f: Filters) => matchStatus(l, f.status) && (f.esign === "all" || l.signatureStatus === f.esign);

const searchText = (l: Lease) => [l.leaseNumber, l.unit.unitNumber, `Unit ${l.unit.unitNumber}`, ...l.tenants.map((t) => t.fullName)];

const sorts: Record<string, SortColumn<Lease>> = {
  tenant: { kind: "text", value: (l) => primaryTenant(l)?.fullName },
  rent: { kind: "money", value: (l) => l.rent },
  expires: { kind: "date", value: (l) => l.endDate },
  balance: { kind: "money", value: (l) => l.balance },
};

const sortOptions: SortOption[] = [
  { key: "tenant", label: "Tenant", kind: "text" },
  { key: "rent", label: "Rent", kind: "money" },
  { key: "expires", label: "Expires", kind: "date" },
  { key: "balance", label: "Balance", kind: "money" },
];

/** /leases: KPIs, toolbar (status segments, search, Property = sidebar scope, e-sign) and the leases table. Row click opens /leases/:id. */
export function LeasesPage() {
  const [params] = useSearchParams();
  // Old links: /leases?lease=ID -> /leases/ID.
  const legacyId = params.get("lease");
  if (legacyId) return <Navigate to={`/leases/${encodeURIComponent(legacyId)}`} replace />;
  return <LeasesList />;
}

function LeasesList() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { me } = useAuth();
  const role = me!.role;
  const canCreate = can(role, "lease.create");
  const canEdit = can(role, "lease.edit");
  const { propertyId: scope, setPropertyId } = useScope();

  const properties = useProperties();
  const leases = useLeases({ propertyId: scope ?? undefined });
  const activate = useActivateAction();

  const [adding, setAdding] = useState(false);
  const [editLease, setEditLease] = useState<Lease | null>(null);
  const [endLease, setEndLease] = useState<Lease | null>(null);
  const [deleteLease, setDeleteLease] = useState<Lease | null>(null);
  const addProperty = useAddPropertyFlow();

  // Default order: ACTIVE by soonest end, then DRAFT newest first, then ENDED / TERMINATED latest end first.
  const rows = useMemo(() => (leases.data ? [...leases.data].sort(compareLeasesDefault) : undefined), [leases.data]);
  const table = useClientTable<Lease, Filters>({
    rows,
    searchText,
    initialFilters,
    matchFilters,
    sorts,
    inUrl: true,
    filterValues: { status: statusValues, esign: esignValues },
  });

  const all = useMemo(() => leases.data ?? [], [leases.data]);
  const kpis = useMemo(() => {
    const active = all.filter((l) => l.status === "ACTIVE");
    return {
      active: active.length,
      started: startedThisMonth(all),
      expiring60: active.filter((l) => expiresWithin(l, 60)).length,
      endingSoon: active.filter((l) => l.endingSoon).length,
      pastEnd: active.filter((l) => isPastEnd(l)),
      rentCents: sumCents(active.map((l) => l.rent)),
    };
  }, [all]);
  const counts = useMemo(
    () => ({
      all: all.length,
      active: all.filter((l) => matchStatus(l, "active")).length,
      expiring: all.filter((l) => matchStatus(l, "expiring")).length,
      draft: all.filter((l) => matchStatus(l, "draft")).length,
      ended: all.filter((l) => matchStatus(l, "ended")).length,
    }),
    [all],
  );

  const ready = leases.isSuccess;
  const kpi = (value: ReactNode) => (ready ? value : leases.isError ? <Dash /> : <Skeleton className="h-10 w-24" />);
  const state: "loading" | "error" | "empty" | "ideal" = leases.isError ? "error" : leases.isPending ? "loading" : table.total === 0 ? "empty" : "ideal";

  const addButton = (variant: "primary" | "secondary") =>
    canCreate ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAdding(true)}>
        Add Lease
      </Button>
    ) : undefined;

  const empty =
    all.length === 0
      ? {
          title: "No leases yet",
          description: scope ? "This property has no leases yet." : "Add a lease to a unit to start tracking it.",
          action: addButton("secondary"),
        }
      : {
          title: "No leases match your filters",
          description: "Try another search, status or e-sign status.",
          action: <Button onClick={table.clearFilters}>Clear filters</Button>,
        };
  const error = { title: "Couldn't load leases", description: leases.isError ? errorText(leases.error) : undefined, onRetry: () => void leases.refetch() };

  const onActivate = async (l: Lease) => {
    const failure = await activate.run(l.id);
    // A failed activation opens the lease page with the reason and the "Edit lease" button.
    if (failure) void navigate(`/leases/${encodeURIComponent(l.id)}`, { state: { from: "leases", activateError: failure } satisfies LeasePageState });
  };

  const statusControl = (
    <SegmentedControl<StatusFilter>
      aria-label="Lease status"
      value={table.filters.status}
      onChange={(v) => table.setFilter("status", v)}
      className={isMobile ? "flex-wrap" : undefined}
      segments={[
        { value: "all", label: "All", count: counts.all },
        { value: "active", label: "Active", count: counts.active },
        { value: "expiring", label: "Expiring", count: counts.expiring },
        { value: "draft", label: "Draft", count: counts.draft },
        { value: "ended", label: "Ended", count: counts.ended },
      ]}
    />
  );
  const search = <SearchInput placeholder="Search tenant, unit or lease number" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />;
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
  const esignSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "E-sign status"} value={table.filters.esign} onChange={(e) => table.setFilter("esign", e.target.value as Filters["esign"])}>
      <option value="all">All e-sign statuses</option>
      {(Object.keys(signatureStatusLabels) as SignatureStatus[]).map((s) => (
        <option key={s} value={s}>
          {signatureStatusLabels[s]}
        </option>
      ))}
    </Select>
  );

  if (properties.data?.length === 0) {
    return (
      <>
        <PageHeader title="Leases" />
        <NoProperties onAdd={addProperty.open} />
        {addProperty.modals}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Leases"
        description={ready ? `Lease lifecycle for ${plural(all.length, "lease")}, with signature status.` : undefined}
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard
          label="Active"
          tone="success"
          value={kpi(kpis.active)}
          delta={ready ? { direction: "up", label: String(kpis.started) } : undefined}
          note={ready ? "started this month" : undefined}
        />
        <KpiCard
          label="Expiring in 60 days"
          tone="warning"
          value={kpi(kpis.expiring60)}
          note={ready && kpis.endingSoon > 0 ? <Badge tone="danger">{kpis.endingSoon} under 30 days</Badge> : undefined}
        />
        <KpiCard label="Past end date" tone="danger" value={kpi(kpis.pastEnd.length)} note={ready ? pastEndNote(kpis.pastEnd) : undefined} />
        <KpiCard
          label="Monthly rent"
          value={kpi(formatCompactCurrency(centsToAmount(kpis.rentCents)))}
          delta={ready ? { direction: "flat", label: "/ mo" } : undefined}
        />
      </KpiRow>

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters
            count={table.activeFilterCount + (scope ? 1 : 0)}
            resultCount={ready ? table.total : undefined}
            onClear={() => {
              table.resetFilters();
              setPropertyId(null);
            }}
          >
            <FilterGroup label="Status">{statusControl}</FilterGroup>
            <FormField label="Property" htmlFor="leases-property">
              {propertySelect("leases-property")}
            </FormField>
            <FormField label="E-signature" htmlFor="leases-esign">
              {esignSelect("leases-esign")}
            </FormField>
            <SortSelect id="leases-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {statusControl}
          {search}
          <div className="w-52">{propertySelect()}</div>
          <div className="w-44">{esignSelect()}</div>
        </Toolbar>
      )}

      <div id={table.listId} className="scroll-mt-24">
        <LeasesTable
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
          onOpen={(l) => void navigate(`/leases/${encodeURIComponent(l.id)}`, { state: { from: "leases" } satisfies LeasePageState })}
          onEdit={canEdit ? setEditLease : undefined}
          onActivate={canEdit ? (l) => void onActivate(l) : undefined}
          onEnd={canEdit ? setEndLease : undefined}
          onDelete={canEdit ? setDeleteLease : undefined}
        />
      </div>

      {adding && <LeaseWizard onClose={() => setAdding(false)} />}
      {editLease && <LeaseWizard lease={editLease} onClose={() => setEditLease(null)} />}
      {endLease && <LeaseEndModal lease={endLease} onClose={() => setEndLease(null)} />}
      <LeaseDeleteDialog lease={deleteLease} onClose={() => setDeleteLease(null)} />
    </>
  );
}
