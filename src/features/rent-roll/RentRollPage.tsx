import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button, Dash, Select, Skeleton } from "@/components/atoms";
import { FormField, KpiCard, SearchInput, SegmentedControl } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { addMonthsYM, centsToAmount, currentMonthUTC, formatCompactCurrency, formatPercent, formatMonth } from "@/lib/format";
import { plural, rentStatusLabels } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { ledgerQuery } from "@/features/ledger/hooks";
import { balanceSplit } from "@/features/ledger/overdue";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { useProperties } from "@/features/properties/hooks";
import { useRentRoll } from "@/features/rent-roll/hooks";
import { useLeases } from "@/features/leases/hooks";
import { coTenants } from "@/features/leases/stats";
import { rentReminderLinks } from "@/features/shared/rentReminder";
import { useTenants } from "@/features/tenants/hooks";
import { RentRollTable, type RowReminder } from "@/features/rent-roll/RentRollTable";
import type { LeasePageState } from "@/features/leases/LeasePage";
import {
  collectionBreakdown,
  collectionNote,
  isPastMonth,
  monthFromParam,
  owingCount,
  paymentTargets,
  rowFilterStatus,
  rowSearchText,
  STATUS_FILTERS,
  statusCounts,
  type StatusFilter,
  upcomingRows,
} from "@/features/rent-roll/stats";
import { useScope } from "@/features/scope/scopeContext";
import { useBillingSettings } from "@/features/settings/hooks";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { useListView } from "@/features/shared/listView";
import { ViewToggle } from "@/features/shared/ViewToggle";
import { NoProperties } from "@/features/shared/NoProperties";
import type { RentRollRow } from "@/types/rentRoll";

type Filters = { status: StatusFilter };

const initialFilters: Filters = { status: "all" };

const sorts: Record<string, SortColumn<RentRollRow>> = {
  tenant: { kind: "text", value: (r) => r.primaryTenant?.fullName },
  unit: { kind: "text", value: (r) => r.unit.unitNumber },
  opening: { kind: "money", value: (r) => r.openingBalance },
  paid: { kind: "money", value: (r) => r.paid },
  balance: { kind: "money", value: (r) => r.balance },
};

const sortOptions: SortOption[] = [
  { key: "tenant", label: "Tenant", kind: "text" },
  { key: "unit", label: "Unit", kind: "text" },
  { key: "opening", label: "Previous balance", kind: "money" },
  { key: "paid", label: "Paid", kind: "money" },
  { key: "balance", label: "Balance", kind: "money" },
];

/** Record Payment: from the header (choose a tenant) or preset to one lease. */
type PaymentOpen = { leaseId?: string };

/**
 * /rent-roll: month switcher (?month=YYYY-MM), KPIs from the summary, status segments + search (client-side) + Property scope,
 * the table with totals, Add charge and Record Payment. Rent is billed automatically (Settings → Billing), so there is no generate button. A row (or "Open ledger") opens the lease page, Ledger tab.
 */
export function RentRollPage() {
  const { me } = useAuth();
  const user = me!;
  const canCharge = can(user, "charge.create");
  const canPay = can(user, "payment.create");
  // Lead days for "Bills automatically on Nov 11": Owner only (managers get 403, so they see the due date instead).
  const billing = useBillingSettings(can(user, "billing.manage"));
  const billingLeadDays = billing.data?.billingLeadDays ?? null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  // Phones always get cards; the saved choice is for wider screens.
  const [view, setView] = useListView("rent-roll", "table");
  const cards = view === "cards" && !isMobile;
  const { propertyId: scope, setPropertyId } = useScope();

  const [params, setParams] = useSearchParams();
  const month = monthFromParam(params.get("month"));
  const monthLabel = formatMonth(month);
  // Another month starts on page 1 and keeps the scroll position (the switcher is in the header).
  const setMonth = (next: string) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set("month", next);
        out.delete("page");
        return out;
      },
      { preventScrollReset: true },
    );

  const properties = useProperties();
  const rentRoll = useRentRoll(month, scope);
  const allRows = useMemo(() => rentRoll.data?.rows ?? [], [rentRoll.data]);
  const summary = rentRoll.data?.summary;
  // Leases tell which NOT_BILLED rows the automatic billing skips ("Upcoming"). null while they load (no banner, no Upcoming yet);
  // if they fail, every NOT_BILLED row counts as billable, as before.
  const leases = useLeases({ propertyId: scope ?? undefined });
  const upcoming = useMemo(
    () => (leases.isSuccess ? upcomingRows(allRows, leases.data, month) : leases.isError ? new Map() : null),
    [leases.isSuccess, leases.isError, leases.data, allRows, month],
  );
  // Call / Email reminder on OVERDUE rows, current month only (a past month's balance may be paid by now).
  // Phone and email come from the cached tenants list; the items hide while it loads or fails. CC: co-tenants, once the leases load.
  // The email quotes the overdue amount, not the row balance (it can include rent not due yet): Email reminder fetches the
  // lease's ledger first (cached) and leaves the amount out if that fails.
  const tenants = useTenants();
  const senderName = me?.name ?? "";
  const reminderFor = useMemo(() => {
    if (month !== currentMonthUTC() || !tenants.isSuccess) return undefined;
    const byId = new Map(tenants.data.map((t) => [t.id, t]));
    const leaseById = new Map((leases.data ?? []).map((l) => [l.id, l]));
    return (r: RentRollRow): RowReminder | null => {
      const tenant = r.primaryTenant ? byId.get(r.primaryTenant.id) : undefined;
      const dueDate = r.oldestUnpaidDueDate;
      if (r.status !== "OVERDUE" || !tenant || !dueDate) return null;
      const lease = leaseById.get(r.leaseId);
      const links = (overdue: number | null) =>
        rentReminderLinks({
          tenantName: tenant.fullName,
          email: tenant.email,
          cc: lease ? coTenants(lease).map((t) => t.email).filter(Boolean) : [],
          phone: tenant.phone,
          propertyName: r.unit.property.name,
          unitNumber: r.unit.unitNumber,
          overdue,
          dueDate,
          senderName,
        });
      const base = links(null);
      const email = async () => {
        let overdue: number | null = null;
        try {
          const ledger = await queryClient.fetchQuery(ledgerQuery(r.leaseId));
          overdue = centsToAmount(balanceSplit(ledger.entries, ledger.summary.balance).overdueCents);
        } catch {
          // Leave the amount out rather than quote the whole balance.
        }
        const href = links(overdue).mailto;
        if (href) window.location.href = href;
      };
      return { tel: base.tel, email: base.mailto ? () => void email() : null };
    };
  }, [month, tenants.isSuccess, tenants.data, leases.data, senderName, queryClient]);
  const matchFilters = useCallback((r: RentRollRow, f: Filters) => f.status === "all" || rowFilterStatus(r, upcoming) === f.status, [upcoming]);
  // API order (property, unit, lease number) is the default; status and search are filtered here.
  const table = useClientTable<RentRollRow, Filters>({
    rows: rentRoll.data?.rows,
    searchText: rowSearchText,
    initialFilters,
    matchFilters,
    sorts,
    inUrl: true,
    filterValues: { status: STATUS_FILTERS },
  });
  const counts = useMemo(() => statusCounts(allRows, upcoming), [allRows, upcoming]);
  const targets = useMemo(() => paymentTargets(allRows), [allRows]);
  const collectedNote = useMemo(() => collectionNote(collectionBreakdown(allRows)), [allRows]);

  const [chargeFor, setChargeFor] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentOpen | null>(null);
  const addProperty = useAddPropertyFlow();

  // The lease page, Ledger tab, with a breadcrumb back to this month.
  // `from` shows the lease page's back arrow.
  const openLedger = (r: RentRollRow) =>
    void navigate(`/leases/${encodeURIComponent(r.leaseId)}?tab=ledger&from=rent-roll&month=${month}`, { state: { from: "rent-roll" } satisfies LeasePageState });

  const ready = rentRoll.isSuccess;
  const kpi = (value: ReactNode) => (ready ? value : rentRoll.isError ? <Dash /> : <Skeleton className="h-10 w-24" />);
  const state: "loading" | "error" | "empty" | "ideal" = rentRoll.isError ? "error" : rentRoll.isPending ? "loading" : table.total === 0 ? "empty" : "ideal";
  const pastMonth = isPastMonth(month);

  const empty =
    allRows.length === 0
      ? {
          title: `No leases to bill in ${monthLabel}`,
          description: "Only active leases, and ended leases with a balance, show here.",
          action: <Button onClick={() => void navigate("/leases")}>Go to Leases</Button>,
        }
      : {
          title: "No rows match your filters",
          description: "Try another search or status.",
          action: <Button onClick={table.clearFilters}>Clear filters</Button>,
        };
  const error = { title: "Couldn't load the rent roll", description: rentRoll.isError ? errorText(rentRoll.error) : undefined, onRetry: () => void rentRoll.refetch() };

  const paymentButton = (className?: string) =>
    canPay ? (
      <Button variant="primary" className={className} icon={<Plus size={16} strokeWidth={1.5} />} disabled={allRows.length === 0} onClick={() => setPayment({})}>
        Record Payment
      </Button>
    ) : null;
  const isCurrent = month === currentMonthUTC();
  // Phones: 44px month arrows and a month button that fills the row.
  const monthSwitcher = (
    <div className={cn("flex items-center gap-1", isMobile && "w-full")}>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label="Previous month"
        icon={<ChevronLeft size={16} strokeWidth={1.5} />}
        onClick={() => setMonth(addMonthsYM(month, -1))}
      />
      <Button
        className={cn(isMobile && "h-11 flex-1")}
        icon={<Calendar size={16} strokeWidth={1.5} />}
        title={isCurrent ? undefined : "Back to the current month"}
        onClick={() => setMonth(currentMonthUTC())}
      >
        {monthLabel}
      </Button>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label="Next month"
        icon={<ChevronRight size={16} strokeWidth={1.5} />}
        onClick={() => setMonth(addMonthsYM(month, 1))}
      />
    </div>
  );
  const statusControl = (
    <SegmentedControl<StatusFilter>
      aria-label="Rent status"
      value={table.filters.status}
      onChange={(v) => table.setFilter("status", v)}
      segments={STATUS_FILTERS.filter((s) => s !== "UPCOMING" || counts.UPCOMING > 0 || table.filters.status === "UPCOMING").map((s) => ({
        value: s,
        label: s === "all" ? "All" : s === "UPCOMING" ? "Upcoming" : rentStatusLabels[s],
        count: counts[s],
      }))}
      className="max-w-full flex-wrap"
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

  if (properties.data?.length === 0) {
    return (
      <>
        <PageHeader title="Rent Roll" />
        <NoProperties onAdd={addProperty.open} />
        {addProperty.modals}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Rent Roll"
        description={`Unit-by-unit payment ledger for the ${monthLabel} collection period. Rent is billed automatically before each due date.`}
        actions={
          isMobile ? (
            <div className="flex w-full flex-col gap-3">
              {monthSwitcher}
              {paymentButton("h-11 w-full")}
            </div>
          ) : (
            <>
              {monthSwitcher}
              {paymentButton()}
            </>
          )
        }
      />

      <KpiRow>
        <KpiCard
          label="Total collected"
          tone="success"
          value={kpi(formatCompactCurrency(summary?.collected))}
          delta={ready && summary?.collectionRate !== null ? { direction: "up", label: formatPercent(summary?.collectionRate) } : undefined}
          note={
            ready ? (
              <>
                {summary?.collectionRate === null ? "Nothing billed yet" : `of ${formatCompactCurrency(summary?.totalRentDue)} due`}
                {collectedNote && <span className="block">{collectedNote}</span>}
              </>
            ) : undefined
          }
        />
        <KpiCard
          label="Outstanding balance"
          tone="danger"
          value={kpi(formatCompactCurrency(summary?.outstandingBalance))}
          delta={ready ? { direction: "down", label: plural(owingCount(allRows), "lease") } : undefined}
          note={ready ? `${summary?.overdueCount ?? 0} overdue` : undefined}
        />
        <KpiCard
          // overdueTotal adds up the whole balances of OVERDUE rows (they can include charges due later this month).
          label="Owed by overdue leases"
          tone="danger"
          value={kpi(formatCompactCurrency(summary?.overdueTotal))}
          note={ready ? `${plural(summary?.overdueCount ?? 0, "lease")} past their due date` : undefined}
        />
        <KpiCard
          label="Deposits held"
          value={kpi(formatCompactCurrency(summary?.securityDepositsHeld))}
          note={ready ? `${plural(summary?.activeDepositCount ?? 0, "active lease")}${isCurrent ? "" : ", as of today"}` : undefined}
        />
      </KpiRow>

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters count={table.activeFilterCount} resultCount={ready ? table.total : undefined} onClear={table.resetFilters}>
            <FilterGroup label="Rent status">{statusControl}</FilterGroup>
            <FormField label="Property (all pages)" htmlFor="rent-roll-property">
              {propertySelect("rent-roll-property")}
            </FormField>
            <SortSelect id="rent-roll-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {statusControl}
          {search}
          <div className="w-52">{propertySelect()}</div>
          <div className="flex-1" />
          {cards && <SortSelect compact id="rent-roll-sort-desktop" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />}
          <ViewToggle value={view} onChange={setView} />
        </Toolbar>
      )}

      <div id={table.listId} className="scroll-mt-24">
        <RentRollTable
          cards={cards}
          showProperty={!scope}
          pastMonth={pastMonth}
          billingLeadDays={billingLeadDays}
          upcoming={upcoming}
          rows={table.pageRows}
          totalRows={table.filteredRows}
          state={state}
          sort={table.sort}
          onSortChange={table.setSort}
          empty={empty}
          error={error}
          caption={`Rent roll, ${monthLabel}`}
          footer={
            table.showPagination ? (
              <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} summary={table.summary} />
            ) : undefined
          }
          onOpen={openLedger}
          onRecordPayment={canPay ? (r) => setPayment({ leaseId: r.leaseId }) : undefined}
          onAddCharge={canCharge ? (r) => setChargeFor(r.leaseId) : undefined}
          reminderFor={reminderFor}
        />
      </div>

      {chargeFor && <AddChargeModal leaseId={chargeFor} month={month} onClose={() => setChargeFor(null)} />}
      {payment && <RecordPaymentModal targets={targets} presetLeaseId={payment.leaseId} onClose={() => setPayment(null)} />}
    </>
  );
}
