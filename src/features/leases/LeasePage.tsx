import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { FileX, Pencil, Plus, Wallet } from "lucide-react";
import { Avatar, Button, Dash, H1, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, StatusBadge, Tabs } from "@/components/molecules";
import type { ModuleKey } from "@/components/organisms";
import { usePageNav, usePageTitle } from "@/app/pageTitle";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { currentMonthUTC, daysUntil, formatCurrency, formatDate, formatMonth, isMonth, ordinal, toCents } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useActivateAction, useLease, type ActivateError } from "@/features/leases/hooks";
import { LeaseAlert } from "@/features/leases/LeaseAlert";
import { LeaseDeleteDialog } from "@/features/leases/LeaseDeleteDialog";
import { LeaseEndModal } from "@/features/leases/LeaseEndModal";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { DetailsTab, TenantsTab } from "@/features/leases/LeaseTabs";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, primaryTenant } from "@/features/leases/stats";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { balanceText } from "@/features/ledger/balance";
import { useLedger } from "@/features/ledger/hooks";
import { LedgerView } from "@/features/ledger/LedgerView";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { leasePaymentTarget } from "@/features/ledger/targets";
import { BackBreadcrumb, Tile, type Crumb } from "@/features/shared/DetailParts";
import { linkFocus, textLink } from "@/features/shared/linkClass";
import type { Lease } from "@/types/lease";

type Tab = "ledger" | "details" | "tenants";
const TABS: Tab[] = ["ledger", "details", "tenants"];

/** Where an in-app click came from: names the first crumb (the place the back arrow goes) and picks the Sidebar item. */
export type LeaseOrigin = "leases" | "rent-roll" | "dashboard" | "tenants" | "units" | "property";

/** Router state from every link into the lease page. Without `from` (pasted link, new tab) the parent is Leases (or the Rent Roll month from the URL). */
export interface LeasePageState {
  from?: LeaseOrigin;
  /** With from "property" (the Unit drawer on a property page): the crumb names it and links to it. */
  property?: { id: string; name: string };
  /** A failed kebab Activate on the Leases list, shown under the header. */
  activateError?: ActivateError;
}

/** Opened from the Rent Roll (?from=rent-roll&month=YYYY-MM): the Ledger tab is the default. */
function useOrigin() {
  const [params] = useSearchParams();
  const month = params.get("month");
  const fromRentRoll = params.get("from") === "rent-roll" && isMonth(month);
  return { fromRentRoll, month: fromRentRoll ? month : null };
}

/** The first crumb and the Sidebar item for where the page was opened from; the URL's Rent Roll month survives a pasted link. */
function useParent(): { parent: Crumb; nav: ModuleKey; backInHistory: boolean } {
  const location = useLocation();
  const { fromRentRoll, month } = useOrigin();
  const state = location.state as LeasePageState | null;
  const from = state?.from;
  const backInHistory = Boolean(from);
  if (from === "dashboard") return { parent: { label: "Dashboard", to: "/" }, nav: "dashboard", backInHistory };
  if (from === "tenants") return { parent: { label: "Tenants", to: "/tenants" }, nav: "tenants", backInHistory };
  if (from === "units") return { parent: { label: "Units", to: "/units" }, nav: "units", backInHistory };
  if (from === "property" && state?.property) {
    return { parent: { label: state.property.name, to: `/properties/${encodeURIComponent(state.property.id)}` }, nav: "properties", backInHistory };
  }
  if (fromRentRoll) return { parent: { label: `Rent Roll · ${formatMonth(month!)}`, to: `/rent-roll?month=${month}` }, nav: "rentroll", backInHistory };
  return { parent: { label: "Leases", to: "/leases" }, nav: "leases", backInHistory };
}

/** [←] Parent › Current: the arrow and the crumb go back to where the page was opened from (see `useParent`). */
function PageTop({ current }: { current: ReactNode }) {
  const { parent, nav, backInHistory } = useParent();
  usePageNav(nav);
  return <BackBreadcrumb parent={parent} current={current} backInHistory={backInHistory} />;
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

/** "Unit 4B, Maple Court · Nov 1, 2026 to Oct 31, 2027 · LSE-2026-001"; a DRAFT without both dates shows "Draft". */
function subtitle(lease: Lease): string {
  const unit = `Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}`;
  const dates = lease.startDate && lease.endDate ? `${formatDate(lease.startDate)} to ${formatDate(lease.endDate)}` : lease.status === "DRAFT" ? "Draft" : formatDate(lease.endDate);
  return [unit, dates, lease.leaseNumber].join(" · ");
}

/** "in 12 days", "today", "ended 3 days ago", or Dash without an end date. */
function endsNote(endDate: string | null): ReactNode {
  const days = daysUntil(endDate);
  if (days === null) return <Dash />;
  if (days === 0) return "today";
  return days > 0 ? `in ${plural(days, "day")}` : `ended ${plural(-days, "day")} ago`;
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

  const ledger = useLedger(lease.id);
  const activate = useActivateAction();

  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : fromRentRoll ? "ledger" : "details";
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

  const [activateError, setActivateError] = useState<ActivateError | null>((location.state as LeasePageState | null)?.activateError ?? null);
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [charging, setCharging] = useState(false);
  const [paying, setPaying] = useState(false);

  const primary = primaryTenant(lease);
  const summary = ledger.data?.summary;
  const balanceCents = summary ? toCents(summary.balance) : 0;
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
        {canEdit && <Button onClick={() => setEnding(true)}>End lease</Button>}
        {canEdit && (
          <Button icon={editIcon} onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {chargeButton}
        {payButton(true)}
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
                <Small className="block">{subtitle(lease)}</Small>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Current balance"
              loading={ledger.isPending}
              value={summary ? balanceText(summary.balance) : <Dash />}
              note={ledger.isError ? ledgerRetry : dueNote(due)}
              className={summary ? (balanceCents > 0 ? "text-danger" : "text-success") : undefined}
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
            <Tile label="Lease ends" loading={false} value={formatDate(lease.endDate)} note={endsNote(lease.endDate)} />
          </div>
        </div>
        <div className="px-6">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={[
              { value: "ledger", label: "Ledger", count: ledger.data?.entries.length },
              { value: "details", label: "Details" },
              { value: "tenants", label: "Tenants", count: lease.tenants.length },
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
      <LeaseAlert lease={lease} />

      {tab === "ledger" ? (
        isDraft ? (
          <Card padding="none">
            <EmptyState icon={<Wallet strokeWidth={1.5} />} title="No ledger on a draft" description="Activate the lease to add charges and payments." />
          </Card>
        ) : (
          <LedgerView lease={lease} canVoid={canVoid} canCharge={canCharge} canPay={canPay} />
        )
      ) : tab === "details" ? (
        <DetailsTab lease={lease} canEdit={canEdit} />
      ) : (
        <TenantsTab lease={lease} />
      )}

      {editing && <LeaseWizard lease={lease} onSaved={() => setActivateError(null)} onClose={() => setEditing(false)} />}
      {ending && <LeaseEndModal lease={lease} onClose={() => setEnding(false)} />}
      <LeaseDeleteDialog lease={deleting ? lease : null} onClose={() => setDeleting(false)} onDeleted={() => void navigate("/leases")} />
      {/* From the Rent Roll, a Rent charge is for that month; otherwise the current UTC month. */}
      {charging && <AddChargeModal leaseId={lease.id} month={month ?? currentMonthUTC()} onClose={() => setCharging(false)} />}
      {paying && summary && (
        <RecordPaymentModal targets={[leasePaymentTarget(lease, summary.balance)]} presetLeaseId={lease.id} onClose={() => setPaying(false)} />
      )}
    </>
  );
}
