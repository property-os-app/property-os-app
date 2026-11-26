import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { FileX, History, Pencil, Plus, Wallet } from "lucide-react";
import { Avatar, Button, Dash, H1, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, StatusBadge, Tabs } from "@/components/molecules";
import type { ModuleKey } from "@/components/organisms";
import { usePageNav, usePageTitle } from "@/app/pageTitle";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { centsToAmount, currentMonthUTC, daysUntil, formatCurrency, formatDate, formatMonth, isMonth, ordinal, toCents } from "@/lib/format";
import { plural, unitLabel } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { useDocuments } from "@/features/documents/hooks";
import { DetailsTab } from "@/features/leases/DetailsTab";
import type { FieldName } from "@/features/leases/form";
import { useActivateAction, useLease, type ActivateError } from "@/features/leases/hooks";
import { leaseDepositTotal } from "@/features/deposits/endPreview";
import { LeaseAlert } from "@/features/leases/LeaseAlert";
import { LeaseDeleteDialog } from "@/features/leases/LeaseDeleteDialog";
import { endActionLabel, leaseEndDate } from "@/features/leases/leaseEnd";
import { LeaseEndModal } from "@/features/leases/LeaseEndModal";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { TenantsTab } from "@/features/leases/LeaseTabs";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { balanceTone, balanceToneClass, balanceValueText, canDeleteLease, dueNote, dueState, isClosed, isOldLease, leasePeriod, primaryTenant } from "@/features/leases/stats";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { creditAmount } from "@/features/ledger/cards";
import { useLedger } from "@/features/ledger/hooks";
import { balanceSplit, type BalanceSplit } from "@/features/ledger/overdue";
import { LedgerView } from "@/features/ledger/LedgerView";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { leasePaymentTarget } from "@/features/ledger/targets";
import { BackBreadcrumb, Tile, type Crumb } from "@/features/shared/DetailParts";
import { linkFocus, textLink } from "@/features/shared/linkClass";
import type { UnitPageState } from "@/features/units/origin";
import type { Lease } from "@/types/lease";

type Tab = "ledger" | "details" | "tenants" | "documents";
const TABS: Tab[] = ["ledger", "details", "tenants", "documents"];

/** Where an in-app click came from: names the first crumb (the place the back arrow goes) and picks the Sidebar item. */
export type LeaseOrigin = "leases" | "rent-roll" | "dashboard" | "tenants" | "units" | "property" | "tenant" | "unit";

/** Router state from every link into the lease page. Without `from` (pasted link, new tab) the parent is Leases (or the Rent Roll month from the URL). */
export interface LeasePageState {
  from?: LeaseOrigin;
  /** With from "property": the crumb names it and links to it. */
  property?: { id: string; name: string };
  /** With from "tenant" (the tenant page): the crumb names the tenant and links to the page. */
  tenant?: { id: string; name: string };
  /** With from "unit" (the unit page): the crumb "Unit 4B, Maple Court" links to it. */
  unit?: { id: string; name: string };
  /** A failed kebab Activate on the Leases list, shown under the header. */
  activateError?: ActivateError;
}

/**
 * Opened from the Rent Roll: the month view (?from=rent-roll&month=YYYY-MM) or the year view (?from=rent-roll&view=year&year=YYYY).
 * Either way the Ledger tab is the default. `month` is only set from the month view (Add charge uses it).
 */
function useOrigin() {
  const [params] = useSearchParams();
  const month = params.get("month");
  const year = params.get("year");
  const fromRentRoll = params.get("from") === "rent-roll";
  const yearView = fromRentRoll && params.get("view") === "year" && /^\d{4}$/.test(year ?? "");
  const monthView = fromRentRoll && !yearView && isMonth(month);
  return { fromRentRoll: monthView || yearView, month: monthView ? month : null, year: yearView ? year : null };
}

/** The first crumb and the Sidebar item for where the page was opened from; the URL's Rent Roll month or year survives a pasted link. */
function useParent(): { parent: Crumb; nav: ModuleKey; backInHistory: boolean } {
  const location = useLocation();
  const { fromRentRoll, month, year } = useOrigin();
  const state = location.state as LeasePageState | null;
  const from = state?.from;
  const backInHistory = Boolean(from);
  if (from === "dashboard") return { parent: { label: "Dashboard", to: "/" }, nav: "dashboard", backInHistory };
  if (from === "tenants") return { parent: { label: "Tenants", to: "/tenants" }, nav: "tenants", backInHistory };
  if (from === "units") return { parent: { label: "Units", to: "/units" }, nav: "units", backInHistory };
  if (from === "tenant" && state?.tenant) {
    return { parent: { label: state.tenant.name, to: `/tenants/${encodeURIComponent(state.tenant.id)}?tab=leases` }, nav: "tenants", backInHistory };
  }
  if (from === "unit" && state?.unit) {
    return { parent: { label: state.unit.name, to: `/units/${encodeURIComponent(state.unit.id)}?tab=history` }, nav: "units", backInHistory };
  }
  if (from === "property" && state?.property) {
    return { parent: { label: state.property.name, to: `/properties/${encodeURIComponent(state.property.id)}` }, nav: "properties", backInHistory };
  }
  if (year) return { parent: { label: `Rent Roll · ${year}`, to: `/rent-roll?view=year&year=${year}` }, nav: "rentroll", backInHistory };
  if (fromRentRoll) return { parent: { label: `Rent Roll · ${formatMonth(month!)}`, to: `/rent-roll?month=${month}` }, nav: "rentroll", backInHistory };
  return { parent: { label: "Leases", to: "/leases" }, nav: "leases", backInHistory };
}

/** [←] Parent › Current: the arrow and the crumb go back to where the page was opened from (see `useParent`). */
function PageTop({ current }: { current: ReactNode }) {
  const { parent, nav, backInHistory } = useParent();
  usePageNav(nav);
  return <BackBreadcrumb parent={parent} current={current} backInHistory={backInHistory} />;
}

/** The balance tile note, plus "includes $1,200.00 not due yet" when only part of the balance is due. */
function balanceNote(note: string, split: BalanceSplit | undefined, balanceCents: number): string {
  if (!split || split.notDueCents === 0 || split.notDueCents >= balanceCents) return note;
  return `${note} · includes ${formatCurrency(centsToAmount(split.notDueCents))} not due yet`;
}

/**
 * /leases/:id: everything about one lease. Header card (tenant, unit, dates, badges, actions by status and role, 4 tiles),
 * the alert card, and Ledger / Details / Tenants tabs kept in ?tab=. Opened from the Rent Roll it links back to that month.
 */
export function LeasePage() {
  const { id = "" } = useParams();
  const lease = useLease(id);
  usePageTitle(lease.data ? `Lease ${lease.data.leaseNumber}` : undefined);

  // A 404 also means "not visible to this manager".
  if (lease.error instanceof ApiError && lease.error.status === 404) {
    return (
      <>
        <PageTop current="Not found" />
        <Card padding="none">
          <EmptyState
            icon={<FileX strokeWidth={1.5} />}
            title="Lease not found"
            description="It doesn't exist, was deleted, or isn't on a property assigned to you."
            action={
              <Link to="/leases" className={textLink}>
                Back to Leases
              </Link>
            }
          />
        </Card>
      </>
    );
  }
  if (lease.isError) {
    return (
      <>
        <PageTop current="Lease" />
        <InlineError title="Couldn't load this lease" description={errorText(lease.error)} onRetry={() => void lease.refetch()} />
      </>
    );
  }
  if (lease.isPending) {
    return (
      <>
        <PageTop current={<Skeleton className="inline-block h-3 w-24" />} />
        <Card>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Skeleton className="size-14 rounded-pill" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="h-4 w-96 max-w-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </Card>
      </>
    );
  }
  return <LeaseDetail key={lease.data.id} lease={lease.data} />;
}

/**
 * "Unit 4B, Maple Court · Nov 1, 2026 to Oct 31, 2027 · LSE-2026-001" (`leasePeriod`); a DRAFT without both dates shows
 * "Draft". The unit links to its page (Back returns to this lease).
 */
function Subtitle({ lease }: { lease: Lease }) {
  const unit = `${unitLabel(lease.unit.unitNumber)}, ${lease.unit.property.name}`;
  const dates = lease.startDate && lease.endDate ? leasePeriod(lease) : lease.status === "DRAFT" ? "Draft" : formatDate(leaseEndDate(lease));
  const state: UnitPageState = { from: "lease", lease: { id: lease.id, number: lease.leaseNumber } };
  return (
    <>
      <Link to={`/units/${encodeURIComponent(lease.unit.id)}`} state={state} className={cn("text-text-secondary underline-offset-2 hover:text-text-primary hover:underline", linkFocus)}>
        {unit}
      </Link>
      {` · ${[dates, lease.leaseNumber].join(" · ")}`}
    </>
  );
}

/** "in 12 days", "today", "ended 3 days ago", or Dash without an end date. */
function endsNote(endDate: string | null): ReactNode {
  const days = daysUntil(endDate);
  if (days === null) return <Dash />;
  if (days === 0) return "today";
  return days > 0 ? `in ${plural(days, "day")}` : `ended ${plural(-days, "day")} ago`;
}

/**
 * The last tile: "Lease ends", or on a closed lease (not an old one) the day it ended or was cancelled. Leases ended before
 * the API had `endedOn` only have their planned end date, so the tile says the real one isn't recorded.
 */
function EndTile({ lease }: { lease: Lease }) {
  if (lease.cancelledOn) return <Tile label="Cancelled" loading={false} value={formatDate(lease.cancelledOn)} note="never moved in" />;
  if (lease.endedOn) {
    // A UTC day can still be tomorrow here.
    const days = -(daysUntil(lease.endedOn) ?? 0);
    return <Tile label="Ended" loading={false} value={formatDate(lease.endedOn)} note={days > 0 ? `${plural(days, "day")} ago` : "today"} />;
  }
  if (isClosed(lease)) return <Tile label="End date" loading={false} value={formatDate(lease.endDate)} note="actual date not recorded" />;
  return <Tile label="Lease ends" loading={false} value={formatDate(lease.endDate)} note={endsNote(lease.endDate)} />;
}

function LeaseDetail({ lease }: { lease: Lease }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { fromRentRoll, month } = useOrigin();
  const { me } = useAuth();
  const user = me!;
  const canEdit = can(user, "lease.edit");
  const canCharge = can(user, "charge.create");
  const canPay = can(user, "payment.create");
  const canVoid = can(user, "entry.void");
  const canSettle = can(user, "deposit.settle");

  // An old (history-only) lease is never billed: no ledger call, no Ledger tab, no money actions.
  const old = isOldLease(lease);
  const ledger = useLedger(lease.id, { enabled: !old });
  const documents = useDocuments({ owner: "leases", ownerId: lease.id });
  const activate = useActivateAction();

  const tabParam = params.get("tab") as Tab | null;
  const tabs = old ? TABS.filter((t) => t !== "ledger") : TABS;
  const tab: Tab = tabParam && tabs.includes(tabParam) ? tabParam : fromRentRoll && !old ? "ledger" : "details";
  const setTab = (next: Tab) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set("tab", next);
        return out;
      },
      // Keep the router state (back arrow, activation error): a URL change without it would drop it.
      { replace: true, preventScrollReset: true, state: location.state },
    );

  /** The ledger's "From deposit settlement" link: open Details and scroll to the Deposit card (reset by any other tab change). */
  const [focusDeposit, setFocusDeposit] = useState(false);
  const changeTab = (next: Tab) => {
    setFocusDeposit(false);
    setTab(next);
  };
  const openDeposit = () => {
    setTab("details");
    setFocusDeposit(true);
  };
  /** The Deposit card's payment link: Ledger tab, All entries, scrolled to that payment (highlighted). */
  const showPayment = (paymentId: string) => {
    setFocusDeposit(false);
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set("tab", "ledger");
        out.set("ledger", "entries");
        out.delete("card");
        out.set("payment", paymentId);
        return out;
      },
      { replace: true, preventScrollReset: true, state: location.state },
    );
  };

  const [activateError, setActivateError] = useState<ActivateError | null>((location.state as LeasePageState | null)?.activateError ?? null);
  // The edit wizard: closed, open at its first step (true), or at the step with a field (Details tab).
  const [editing, setEditing] = useState<boolean | FieldName>(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [charging, setCharging] = useState(false);
  const [paying, setPaying] = useState(false);

  const primary = primaryTenant(lease);
  const summary = ledger.data?.summary;
  const balanceCents = summary ? toCents(summary.balance) : 0;
  // Overdue vs not due yet (rent is billed up to 28 days early), from the ledger until the API sends it.
  const split = ledger.data ? balanceSplit(ledger.data.entries, ledger.data.summary.balance) : undefined;
  const isDraft = lease.status === "DRAFT";

  const onActivate = async () => {
    setActivateError(null);
    const error = await activate.run(lease.id);
    if (error) setActivateError(error);
  };

  /* ---------- Actions: one primary, last; hidden when the role can't ---------- */
  const busy = activate.isPending;
  const editIcon = <Pencil size={16} strokeWidth={1.5} />;
  const chargeButton = canCharge && (
    <Button icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setCharging(true)}>
      Add charge
    </Button>
  );
  const payButton = (primaryVariant: boolean) =>
    canPay && (
      <Button variant={primaryVariant ? "primary" : "secondary"} disabled={summary === undefined} onClick={() => setPaying(true)}>
        Record Payment
      </Button>
    );

  let actions: ReactNode;
  if (isDraft) {
    actions = canEdit && (
      <>
        <Button variant="ghost" disabled={busy} onClick={() => setDeleting(true)}>
          Delete draft
        </Button>
        <Button icon={editIcon} disabled={busy} onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button variant="primary" disabled={busy} aria-busy={busy || undefined} onClick={() => void onActivate()}>
          {busy ? "Activating..." : "Activate"}
        </Button>
      </>
    );
  } else if (lease.status === "ACTIVE") {
    actions = (
      <>
        {canEdit && <Button onClick={() => setEnding(true)}>{endActionLabel(lease)}</Button>}
        {canEdit && (
          <Button icon={editIcon} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {chargeButton}
        {payButton(true)}
      </>
    );
  } else if (old) {
    // Only notes, tags and documents change; Delete only while it has no documents (409 otherwise).
    actions = canEdit && (
      <>
        {canDeleteLease(lease, documents.data?.length) && (
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        )}
        <Button icon={editIcon} onClick={() => setEditing(true)}>
          Edit notes and tags
        </Button>
      </>
    );
  } else {
    actions = (
      <>
        {canEdit && (
          <Button icon={editIcon} onClick={() => setEditing(true)}>
            Edit notes and tags
          </Button>
        )}
        {chargeButton}
        {payButton(balanceCents > 0)}
      </>
    );
  }

  /* ---------- Tiles ---------- */
  const ledgerRetry = (
    <button type="button" onClick={() => void ledger.refetch()} className={cn("text-caption font-semibold text-success hover:underline", linkFocus)}>
      Couldn't load. Retry
    </button>
  );
  const due = dueState(lease);

  return (
    <>
      <PageTop current={lease.leaseNumber} />

      <Card padding="none">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={primary?.fullName ?? "-"} size={56} />
              <div className="flex min-w-0 flex-col gap-1">
                <H1 className="truncate">{primary?.fullName ?? "No tenant yet"}</H1>
                <Small className="block">
                  <Subtitle lease={lease} />
                </Small>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <LeaseBadge lease={lease} />
                  <StatusBadge domain="esign" status={lease.signatureStatus} />
                </div>
              </div>
            </div>
            {/* Phones: the buttons fill the width, two per row, 44px tall. */}
            {actions && (
              <div className="flex flex-wrap items-center gap-2 max-md:[&>*]:h-11 max-md:[&>*]:min-w-[calc(50%-0.25rem)] max-md:[&>*]:flex-1 lg:shrink-0 lg:justify-end">
                {actions}
              </div>
            )}
          </div>

          {old ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Monthly rent" loading={false} value={formatCurrency(lease.rent)} note="As recorded" />
              <Tile
                label="Deposit"
                loading={false}
                value={formatCurrency(leaseDepositTotal(lease))}
                note={toCents(lease.petDeposit) > 0 ? `Security ${formatCurrency(lease.deposit ?? "0")} · Pet ${formatCurrency(lease.petDeposit)}` : "As recorded"}
              />
              <Tile label="Term" loading={false} value={lease.termMonths !== null ? plural(lease.termMonths, "month") : <Dash />} note={formatDate(lease.startDate)} />
              <Tile label="Ended" loading={false} value={formatDate(lease.endDate)} note={endsNote(lease.endDate)} />
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Current balance"
              loading={ledger.isPending}
              // A credit comes from summary.credit (money paid ahead), never from the balance's sign.
              value={summary ? balanceValueText(summary.balance, creditAmount(summary)) : <Dash />}
              note={ledger.isError ? ledgerRetry : creditAmount(summary) ? "Paid ahead" : balanceNote(dueNote(due), split, balanceCents)}
              // Green at $0 or a credit, orange when owed but not late yet (rent billed early), red when overdue.
              className={summary ? balanceToneClass[balanceTone(due, creditAmount(summary))] : undefined}
            />
            <Tile
              label="Monthly rent"
              loading={false}
              value={formatCurrency(lease.rent)}
              note={lease.rentDueDay !== null ? `Due on the ${ordinal(lease.rentDueDay)}` : <Dash />}
            />
            <Tile
              label="Total paid"
              loading={ledger.isPending}
              value={summary ? formatCurrency(summary.totalPaid) : <Dash />}
              note={ledger.isError ? ledgerRetry : summary ? `of ${formatCurrency(summary.totalCharged)} charged` : <Dash />}
              className={summary ? "text-success" : undefined}
            />
            <EndTile lease={lease} />
          </div>
          )}
        </div>
        <div className="px-6">
          <Tabs<Tab>
            value={tab}
            onChange={changeTab}
            className="border-b-0"
            tabs={[
              ...(old ? [] : [{ value: "ledger" as const, label: "Ledger", count: ledger.data?.entries.length }]),
              { value: "details", label: "Details" },
              { value: "tenants", label: "Tenants", count: lease.tenants.length },
              { value: "documents", label: "Documents", count: documents.data?.length },
            ]}
          />
        </div>
      </Card>

      {activateError && (
        <div className="flex flex-col gap-2">
          <InlineError title={activateError.title} description={activateError.description} />
          {activateError.fixable && canEdit && (
            <Button className="self-start" onClick={() => setEditing(true)}>
              Edit lease
            </Button>
          )}
        </div>
      )}
      {old ? (
        <Card padding="compact" className="flex items-center gap-3">
          <History size={16} strokeWidth={1.5} className="shrink-0 text-text-muted" aria-hidden />
          <Small>History only – no rent tracked. This old lease is kept for the record: only its notes, tags and documents can change.</Small>
        </Card>
      ) : (
        <LeaseAlert lease={lease} split={split} />
      )}

      {tab === "ledger" ? (
        isDraft ? (
          <Card padding="none">
            <EmptyState icon={<Wallet strokeWidth={1.5} />} title="No ledger on a draft" description="Activate the lease to add charges and payments." />
          </Card>
        ) : (
          <LedgerView lease={lease} canVoid={canVoid} canCharge={canCharge} canPay={canPay} onOpenDeposit={openDeposit} />
        )
      ) : tab === "details" ? (
        <DetailsTab
          lease={lease}
          canEdit={canEdit}
          onEdit={setEditing}
          onOpenDocuments={() => changeTab("documents")}
          canSettle={canSettle}
          canVoid={canVoid}
          onShowPayment={showPayment}
          focusDeposit={focusDeposit}
        />
      ) : tab === "documents" ? (
        <DocumentsPanel target={{ owner: "leases", ownerId: lease.id }} onOpenLedger={() => setTab("ledger")} emptyText="No documents on this lease yet." />
      ) : (
        <TenantsTab lease={lease} />
      )}

      {editing && <LeaseWizard lease={lease} startAt={editing === true ? undefined : editing} onSaved={() => setActivateError(null)} onClose={() => setEditing(false)} />}
      {ending && <LeaseEndModal lease={lease} onClose={() => setEnding(false)} />}
      <LeaseDeleteDialog lease={deleting ? lease : null} onClose={() => setDeleting(false)} onDeleted={() => void navigate("/leases")} />
      {/* From the Rent Roll, a Rent charge is for that month; otherwise the current UTC month. */}
      {charging && <AddChargeModal leaseId={lease.id} month={month ?? currentMonthUTC()} onClose={() => setCharging(false)} />}
      {paying && summary && (
        <RecordPaymentModal targets={[leasePaymentTarget(lease, summary.balance)]} presetLeaseId={lease.id} onOpenLedger={() => setTab("ledger")} onClose={() => setPaying(false)} />
      )}
    </>
  );
}
