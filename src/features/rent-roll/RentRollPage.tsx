import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button, Caption, Select, Skeleton } from "@/components/atoms";
import { Card, KpiCard, SearchInput, SegmentedControl } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { addMonthsYM, currentMonthUTC, formatCompactCurrency, formatPercent, formatMonth } from "@/lib/format";
import { plural, rentStatusLabels } from "@/lib/labels";
import { useClientTable, type SortColumn } from "@/lib/useClientTable";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { useProperties } from "@/features/properties/hooks";
import { GenerateRentModal } from "@/features/rent-roll/GenerateRentModal";
import { useRentRoll } from "@/features/rent-roll/hooks";
import { LedgerDrawer } from "@/features/rent-roll/LedgerDrawer";
import { RentRollTable } from "@/features/rent-roll/RentRollTable";
import {
  canGenerateRent,
  isPastMonth,
  lastGeneratableMonth,
  monthFromParam,
  owingCount,
  paymentTargets,
  rowSearchText,
  STATUS_FILTERS,
  statusCounts,
  type StatusFilter,
} from "@/features/rent-roll/stats";
import { useScope } from "@/features/scope/scopeContext";
import type { RentRollRow } from "@/types/rentRoll";

type Filters = { status: StatusFilter };

const initialFilters: Filters = { status: "all" };
const matchFilters = (r: RentRollRow, f: Filters) => f.status === "all" || r.status === f.status;

const sorts: Record<string, SortColumn<RentRollRow>> = {
  tenant: { kind: "text", value: (r) => r.primaryTenant?.fullName },
  unit: { kind: "text", value: (r) => r.unit.unitNumber },
  opening: { kind: "money", value: (r) => r.openingBalance },
  paid: { kind: "money", value: (r) => r.paid },
  balance: { kind: "money", value: (r) => r.balance },
};

/** Record Payment: from the header (choose a tenant) or preset to one lease. */
type PaymentOpen = { leaseId?: string };

/**
 * /rent-roll: month switcher (?month=YYYY-MM), KPIs from the summary, status segments + search (client-side) + Property scope,
 * the table with totals, the ledger drawer, Generate rent, Add charge and Record Payment.
 */
export function RentRollPage() {
  const { me } = useAuth();
  const role = me!.role;
  const canCharge = can(role, "charge.create");
  const canPay = can(role, "payment.create");
  const canVoid = can(role, "entry.void");
  const navigate = useNavigate();
  const { propertyId: scope, setPropertyId } = useScope();

  const [params, setParams] = useSearchParams();
  const month = monthFromParam(params.get("month"));
  const monthLabel = formatMonth(month);
  const setMonth = (next: string) =>
    setParams((prev) => {
      const out = new URLSearchParams(prev);
      out.set("month", next);
      return out;
    });

  const properties = useProperties();
  const rentRoll = useRentRoll(month, scope);
  const allRows = useMemo(() => rentRoll.data?.rows ?? [], [rentRoll.data]);
  const summary = rentRoll.data?.summary;
  // API order (property, unit, lease number) is the default; status and search are filtered here.
  const table = useClientTable<RentRollRow, Filters>({ rows: rentRoll.data?.rows, searchText: rowSearchText, initialFilters, matchFilters, sorts });
  const counts = useMemo(() => statusCounts(allRows), [allRows]);
  const targets = useMemo(() => paymentTargets(allRows), [allRows]);

  const [openRow, setOpenRow] = useState<RentRollRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [chargeFor, setChargeFor] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentOpen | null>(null);

  // The drawer follows the refreshed row after a payment or void; it keeps the last one if the row left the month.
  const drawerRow = openRow ? (allRows.find((r) => r.leaseId === openRow.leaseId) ?? openRow) : null;

  const ready = rentRoll.isSuccess;
  const kpi = (value: ReactNode) => (ready ? value : <Skeleton className="h-10 w-24" />);
  const state: "loading" | "error" | "empty" | "ideal" = rentRoll.isError ? "error" : rentRoll.isPending ? "loading" : table.total === 0 ? "empty" : "ideal";
  // Banner by NOT_BILLED rows: all of them -> "not generated", some -> "partly billed", none -> no banner.
  const notBilled = counts.NOT_BILLED;
  const notGenerated = ready && notBilled > 0 && notBilled === allRows.length;
  const partlyBilled = ready && notBilled > 0 && notBilled < allRows.length;
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

  // The backend only bills up to next month (UTC); later months keep the button disabled with a note.
  const generateAllowed = canGenerateRent(month);
  const generateLimitNote = `You can generate rent up to ${formatMonth(lastGeneratableMonth())}.`;
  const generateButton = canCharge ? (
    <Button disabled={!generateAllowed} title={generateAllowed ? undefined : generateLimitNote} onClick={() => setGenerating(true)}>
      Generate rent
    </Button>
  ) : null;
  const isCurrent = month === currentMonthUTC();

  return (
    <>
      <PageHeader
        title="Rent Roll"
        description={
          canCharge && !generateAllowed
            ? `Unit-by-unit payment ledger for the ${monthLabel} collection period. ${generateLimitNote}`
            : `Unit-by-unit payment ledger for the ${monthLabel} collection period.`
        }
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="ghost" iconOnly aria-label="Previous month" icon={<ChevronLeft size={16} strokeWidth={1.5} />} onClick={() => setMonth(addMonthsYM(month, -1))} />
              <Button
                icon={<Calendar size={16} strokeWidth={1.5} />}
                title={isCurrent ? undefined : "Back to the current month"}
                onClick={() => setMonth(currentMonthUTC())}
              >
                {monthLabel}
              </Button>
              <Button variant="ghost" iconOnly aria-label="Next month" icon={<ChevronRight size={16} strokeWidth={1.5} />} onClick={() => setMonth(addMonthsYM(month, 1))} />
            </div>
            {generateButton}
            {canPay && (
              <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} disabled={allRows.length === 0} onClick={() => setPayment({})}>
                Record Payment
              </Button>
            )}
          </>
        }
      />

      <KpiRow>
        <KpiCard
          label="Total collected"
          tone="success"
          value={kpi(formatCompactCurrency(summary?.collected))}
          delta={ready && summary?.collectionRate !== null ? { direction: "up", label: formatPercent(summary?.collectionRate) } : undefined}
          note={ready ? (summary?.collectionRate === null ? "Nothing billed yet" : `of ${formatCompactCurrency(summary?.totalRentDue)} due`) : undefined}
        />
        <KpiCard
          label="Outstanding balance"
          tone="danger"
          value={kpi(formatCompactCurrency(summary?.outstandingBalance))}
          delta={ready ? { direction: "down", label: plural(owingCount(allRows), "lease") } : undefined}
          note={ready ? `${summary?.overdueCount ?? 0} overdue` : undefined}
        />
        <KpiCard
          label="Overdue"
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

      <Toolbar>
        <SegmentedControl<StatusFilter>
          aria-label="Rent status"
          value={table.filters.status}
          onChange={(v) => table.setFilter("status", v)}
          segments={STATUS_FILTERS.map((s) => ({ value: s, label: s === "all" ? "All" : rentStatusLabels[s], count: counts[s] }))}
          className="max-w-full flex-wrap"
        />
        <SearchInput placeholder="Search tenant, unit or lease number" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />
        <div className="w-52">
          <Select aria-label="Property" value={scope ?? "all"} onChange={(e) => setPropertyId(e.target.value === "all" ? null : e.target.value)}>
            <option value="all">All properties</option>
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </Toolbar>

      {notGenerated && (
        <Card padding="compact" className="flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning-soft">
          <div className="flex flex-col">
            <span className="font-semibold text-warning">Rent for {monthLabel} hasn't been generated yet.</span>
            {canCharge && (
              <Caption className="text-text-primary">
                {generateAllowed ? "Generating bills every property you can see, not only the one selected." : generateLimitNote}
              </Caption>
            )}
          </div>
          {generateButton}
        </Card>
      )}

      {partlyBilled && (
        <Card padding="compact" className="flex flex-wrap items-center justify-between gap-3 border-warning/40 bg-warning-soft">
          <div className="flex flex-col">
            <span className="font-semibold text-warning">
              <button type="button" className="cursor-pointer underline underline-offset-2 focus-ring rounded-badge" onClick={() => table.setFilter("status", "NOT_BILLED")}>
                {plural(notBilled, "lease")}
              </button>{" "}
              {notBilled === 1 ? "isn't" : "aren't"} billed for {monthLabel} yet. Generating again skips leases that are already billed.
            </span>
            {canCharge && (
              <Caption className="text-text-primary">
                Leases that generate skips (not monthly, or starting after their due date) can be billed by hand with Add charge, Rent.
              </Caption>
            )}
          </div>
          {generateAllowed && generateButton}
        </Card>
      )}

      <RentRollTable
        showProperty={!scope}
        pastMonth={pastMonth}
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
        onOpen={setOpenRow}
        onRecordPayment={canPay ? (r) => setPayment({ leaseId: r.leaseId }) : undefined}
        onAddCharge={canCharge ? (r) => setChargeFor(r.leaseId) : undefined}
      />

      {drawerRow && (
        <LedgerDrawer
          key={drawerRow.leaseId}
          row={drawerRow}
          canVoid={canVoid}
          onAddCharge={canCharge ? () => setChargeFor(drawerRow.leaseId) : undefined}
          onRecordPayment={canPay ? () => setPayment({ leaseId: drawerRow.leaseId }) : undefined}
          onClose={() => setOpenRow(null)}
        />
      )}
      {generating && <GenerateRentModal month={month} onClose={() => setGenerating(false)} />}
      {chargeFor && <AddChargeModal leaseId={chargeFor} month={month} onClose={() => setChargeFor(null)} />}
      {payment && <RecordPaymentModal targets={targets} presetLeaseId={payment.leaseId} onClose={() => setPayment(null)} />}
    </>
  );
}
