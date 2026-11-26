import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { DoorOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, H1, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, StatusBadge, Tabs } from "@/components/molecules";
import { usePageNav, usePageTitle } from "@/app/pageTitle";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitStatusLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { useDocuments } from "@/features/documents/hooks";
import { useLeases } from "@/features/leases/hooks";
import { creditAmount } from "@/features/ledger/cards";
import { useLedger } from "@/features/ledger/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { OldLeaseModal } from "@/features/leases/OldLeaseModal";
import { balanceTone, balanceToneClass, balanceValueText, dueNote, dueState, leaseEndsNote } from "@/features/leases/stats";
import { useProperty } from "@/features/properties/hooks";
import { NotSet } from "@/features/shared/Missing";
import { BackBreadcrumb, PageSkeleton, Tile } from "@/features/shared/DetailParts";
import { useGoBack, useTabParam } from "@/features/shared/detailNav";
import { textLink } from "@/features/shared/linkClass";
import type { TenantPageState } from "@/features/tenants/origin";
import { useUnit } from "@/features/units/hooks";
import { unitName, unitParent, type UnitPageState } from "@/features/units/origin";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import { UnitFormModal } from "@/features/units/UnitFormModal";
import { UnitLeaseHistory } from "@/features/units/UnitLeaseHistory";
import { UnitCurrentLease, UnitDescriptionCard, UnitInfoCard, UnitNoLease } from "@/features/units/UnitOverview";
import { rentDiffNote, unitSummary } from "@/features/units/stats";
import type { Unit } from "@/types/unit";

type Tab = "overview" | "history" | "documents";
const TABS: Tab[] = ["overview", "history", "documents"];

/** The parent crumb and Sidebar item from the router state and the URL (see `unitParent`). */
function useParent() {
  const location = useLocation();
  const [params] = useSearchParams();
  return unitParent(location.state as UnitPageState | null, params);
}

/** [←] Parent › Current [✕]: the arrow, the crumb, the ✕ and Esc go back to where the page was opened from. */
function PageTop({ current }: { current: ReactNode }) {
  const { parent, nav, backInHistory } = useParent();
  usePageNav(nav);
  return <BackBreadcrumb parent={parent} current={current} backInHistory={backInHistory} />;
}

/**
 * /units/:id: one unit. Header card (icon, "Unit 4B, Maple Court", layout summary, unit status, Add lease / Edit / Delete
 * by role, tiles from the ACTIVE lease or Listed rent and Status when there is none) and Overview / Lease history /
 * Documents tabs kept in ?tab=.
 */
export function UnitPage() {
  const { id = "" } = useParams();
  const unit = useUnit(id);

  // A 404 also means "not visible to this manager".
  if (unit.error instanceof ApiError && unit.error.status === 404) {
    return (
      <>
        <PageTop current="Not found" />
        <Card padding="none">
          <EmptyState
            icon={<DoorOpen strokeWidth={1.5} />}
            title="Unit not found"
            description="This unit was deleted, doesn't exist, or isn't on a property assigned to you."
            action={
              <Link to="/units" className={textLink}>
                Back to Units
              </Link>
            }
          />
        </Card>
      </>
    );
  }
  if (unit.isError) {
    return (
      <>
        <PageTop current="Unit" />
        <InlineError title="Couldn't load this unit" description={errorText(unit.error)} onRetry={() => void unit.refetch()} />
      </>
    );
  }
  if (unit.isPending) return <PageSkeleton top={<PageTop current={<Skeleton className="inline-block h-3 w-24" />} />} tiles={3} />;
  return <UnitDetailView key={unit.data.id} unit={unit.data} />;
}

function UnitDetailView({ unit }: { unit: Unit }) {
  // GET /units/:id has only the property id; the name ("Unit 4B, Maple Court") comes from the property.
  const property = useProperty(unit.propertyId);
  const propertyName = property.data?.name ?? "";
  const name = unitName(unit.unitNumber, property.data?.name);
  usePageTitle(name);
  const { me } = useAuth();
  const user = me!;
  const { parent, backInHistory } = useParent();
  const { goBack } = useGoBack(parent, backInHistory);
  const leases = useLeases({ unitId: unit.id });
  const documents = useDocuments({ owner: "units", ownerId: unit.id });
  const [tab, setTab] = useTabParam(TABS);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);
  const [addingOld, setAddingOld] = useState(false);

  const active = leases.data?.find((l) => l.status === "ACTIVE");
  const canEdit = can(user, "unit.edit");
  const canDelete = can(user, "unit.delete");
  const canAddLease = can(user, "lease.create");
  // "Add lease" once the leases have loaded and none is active.
  const showAddLease = canAddLease && leases.isSuccess && !active;
  /** Leases and tenants opened here go back to this unit. */
  const leaseState: LeasePageState = { from: "unit", unit: { id: unit.id, name } };
  const tenantState: TenantPageState = { from: "unit", unit: { id: unit.id, name } };
  const due = active ? dueState(active) : undefined;
  // The active lease's ledger for its credit (summary.credit, money paid ahead).
  const ledger = useLedger(active?.id ?? "", { enabled: Boolean(active) });
  const credit = creditAmount(ledger.data?.summary);

  return (
    <>
      <PageTop current={name} />

      <Card padding="none">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span aria-hidden className="inline-flex size-14 shrink-0 items-center justify-center rounded-pill bg-surface-3 text-text-muted">
                <DoorOpen size={24} strokeWidth={1.5} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <H1 className="break-words">{name}</H1>
                <Small className="block">{unitSummary(unit)}</Small>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StatusBadge domain="unit" status={unit.status} />
                </div>
              </div>
            </div>
            {/* Phones: the buttons fill the width, two per row, 44px tall. */}
            {(canEdit || canDelete || showAddLease) && (
              <div className="flex flex-wrap items-center gap-2 max-md:[&>*]:h-11 max-md:[&>*]:min-w-[calc(50%-0.25rem)] max-md:[&>*]:flex-1 lg:shrink-0 lg:justify-end">
                {canDelete && (
                  <Button variant="ghost" icon={<Trash2 size={16} strokeWidth={1.5} />} onClick={() => setDeleting(true)}>
                    Delete
                  </Button>
                )}
                {canEdit && (
                  <Button variant={showAddLease ? "secondary" : "primary"} icon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => setEditing(true)}>
                    Edit unit
                  </Button>
                )}
                {showAddLease && (
                  <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAddingLease(true)}>
                    Add lease
                  </Button>
                )}
              </div>
            )}
          </div>

          {active ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Tile label="Current rent" loading={false} value={formatCurrency(active.rent)} note={rentDiffNote(active.rent, unit.monthlyRent)} />
              <Tile
                label="Balance"
                loading={false}
                value={balanceValueText(active.balance, credit)}
                note={credit ? "Paid ahead" : dueNote(due!)}
                className={due ? balanceToneClass[balanceTone(due, credit)] : undefined}
              />
              <Tile label="Lease ends" loading={false} value={formatDate(active.endDate)} note={leaseEndsNote(active)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Tile
                label="Listed rent"
                loading={false}
                value={unit.monthlyRent === null ? <NotSet /> : formatCurrency(unit.monthlyRent)}
                note={unit.monthlyRent === null ? "No listed rent yet" : "Asking rent"}
              />
              <Tile
                label="Status"
                loading={leases.isPending}
                value={unitStatusLabels[unit.status]}
                note={leases.isError ? "Couldn't load the leases" : "No active lease"}
              />
            </div>
          )}
        </div>
        <div className="px-6">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "history", label: "Lease history", count: leases.data?.length },
              { value: "documents", label: "Documents", count: documents.data?.length },
            ]}
          />
        </div>
      </Card>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className={cn("flex min-w-0 flex-col gap-6", unit.description?.trim() ? "lg:col-span-8" : "lg:col-span-12")}>
            {leases.isPending ? (
              <Skeleton className="h-48" />
            ) : leases.isError ? (
              <InlineError title="Couldn't load the lease" description={errorText(leases.error)} onRetry={() => void leases.refetch()} />
            ) : active ? (
              <UnitCurrentLease lease={active} unit={unit} leaseState={leaseState} tenantState={tenantState} credit={credit} />
            ) : (
              <UnitNoLease unit={unit} onAddLease={canAddLease ? () => setAddingLease(true) : undefined} />
            )}
            <UnitInfoCard unit={unit} onEdit={canEdit ? () => setEditing(true) : undefined} />
          </div>
          {unit.description?.trim() && (
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
              <UnitDescriptionCard description={unit.description} />
            </div>
          )}
        </div>
      ) : tab === "documents" ? (
        <DocumentsPanel target={{ owner: "units", ownerId: unit.id }} leaseState={leaseState} emptyText="No documents on this unit or its leases yet." />
      ) : (
        <UnitLeaseHistory query={leases} leaseState={leaseState} onAddOld={canAddLease ? () => setAddingOld(true) : undefined} />
      )}

      {editing && <UnitFormModal unit={unit} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetUnit={unit} onClose={() => setAddingLease(false)} />}
      {addingOld && <OldLeaseModal presetUnit={unit} presetUnitLine={name} onClose={() => setAddingOld(false)} />}
      <UnitDeleteDialog unit={deleting ? unit : null} propertyName={propertyName} onClose={() => setDeleting(false)} onDeleted={goBack} />
    </>
  );
}
