import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Pencil, Trash2, UserX } from "lucide-react";
import { Avatar, Button, H1, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, Tabs } from "@/components/molecules";
import { usePageNav, usePageTitle } from "@/app/pageTitle";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { tenantTypeLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { useDocuments } from "@/features/documents/hooks";
import { useLeases } from "@/features/leases/hooks";
import { creditAmount } from "@/features/ledger/cards";
import { useLedger } from "@/features/ledger/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, leaseEndsNote } from "@/features/leases/stats";
import { BackBreadcrumb, PageSkeleton, Tile } from "@/features/shared/DetailParts";
import { useGoBack, useTabParam } from "@/features/shared/detailNav";
import { textLink } from "@/features/shared/linkClass";
import { useTenant } from "@/features/tenants/hooks";
import { tenantParent, type TenantPageState } from "@/features/tenants/origin";
import { currentLease } from "@/features/tenants/stats";
import { TenantDeleteDialog } from "@/features/tenants/TenantDeleteDialog";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { TenantLeasesTab } from "@/features/tenants/TenantLeasesTab";
import { AddedByLine, TenantContactCard, TenantCurrentLease, TenantNotesCard, TenantPersonalCard } from "@/features/tenants/TenantOverview";
import { RentStatusBadge, TenantLeaseBadge } from "@/features/tenants/TenantParts";
import type { TenantDetail } from "@/types/tenant";

type Tab = "overview" | "leases" | "documents";
const TABS: Tab[] = ["overview", "leases", "documents"];

/** The parent crumb and Sidebar item from the router state (see `tenantParent`). */
function useParent() {
  const location = useLocation();
  return tenantParent(location.state as TenantPageState | null);
}

/** [←] Parent › Current [✕]: the arrow, the crumb, the ✕ and Esc go back to where the page was opened from. */
function PageTop({ current }: { current: ReactNode }) {
  const { parent, nav, backInHistory } = useParent();
  usePageNav(nav);
  return <BackBreadcrumb parent={parent} current={current} backInHistory={backInHistory} />;
}

/**
 * /tenants/:id: one tenant. Header card (avatar, name, type and contact, lease and rent badges, Edit / Delete by role,
 * Rent / Balance / Lease ends tiles from the current ACTIVE lease) and Overview / Leases / Documents tabs kept in ?tab=.
 */
export function TenantPage() {
  const { id = "" } = useParams();
  const tenant = useTenant(id);
  usePageTitle(tenant.data?.fullName);

  // A 404 also means "not visible to this manager".
  if (tenant.error instanceof ApiError && tenant.error.status === 404) {
    return (
      <>
        <PageTop current="Not found" />
        <Card padding="none">
          <EmptyState
            icon={<UserX strokeWidth={1.5} />}
            title="Tenant not found"
            description="This tenant was deleted, doesn't exist, or isn't visible to you."
            action={
              <Link to="/tenants" className={textLink}>
                Back to Tenants
              </Link>
            }
          />
        </Card>
      </>
    );
  }
  if (tenant.isError) {
    return (
      <>
        <PageTop current="Tenant" />
        <InlineError title="Couldn't load this tenant" description={errorText(tenant.error)} onRetry={() => void tenant.refetch()} />
      </>
    );
  }
  if (tenant.isPending) return <PageSkeleton top={<PageTop current={<Skeleton className="inline-block h-3 w-24" />} />} tiles={3} />;
  return <TenantDetailView key={tenant.data.id} tenant={tenant.data} />;
}

function TenantDetailView({ tenant }: { tenant: TenantDetail }) {
  const { me } = useAuth();
  const user = me!;
  const { parent, backInHistory } = useParent();
  const { goBack } = useGoBack(parent, backInHistory);
  // Old (history-only) leases included.
  const leases = useLeases({ tenantId: tenant.id });
  const documents = useDocuments({ owner: "tenants", ownerId: tenant.id });
  // A manager sees a tenant's documents only when the tenant is on a lease in their properties or they created them; else 404 (rules.md): hide the tab.
  const docsHidden = documents.error instanceof ApiError && documents.error.status === 404;
  const [tab, setTab] = useTabParam(docsHidden ? TABS.filter((t) => t !== "documents") : TABS);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);

  const current = leases.data ? currentLease(leases.data) : undefined;
  const active = current?.status === "ACTIVE" ? current : undefined;
  const canEdit = can(user, "tenant.edit");
  const canDelete = can(user, "tenant.delete");
  /** Leases opened here go back to this tenant (its Leases tab). */
  const leaseState: LeasePageState = { from: "tenant", tenant: { id: tenant.id, name: tenant.fullName } };

  const due = active ? dueState(active) : undefined;
  // The active lease's ledger for its credit (summary.credit, money paid ahead).
  const ledger = useLedger(active?.id ?? "", { enabled: Boolean(active) });
  const credit = creditAmount(ledger.data?.summary);
  const noLease = <span className="text-text-muted">None</span>;

  return (
    <>
      <PageTop current={tenant.fullName} />

      <Card padding="none">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={tenant.fullName} size={56} />
              <div className="flex min-w-0 flex-col gap-1">
                <H1 className="break-words">{tenant.fullName}</H1>
                <Small className="block wrap-anywhere">{[tenantTypeLabels[tenant.tenantType], tenant.email, tenant.phone].filter(Boolean).join(" · ")}</Small>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {leases.data && <TenantLeaseBadge lease={current} />}
                  {active && <RentStatusBadge lease={active} />}
                </div>
              </div>
            </div>
            {/* Phones: the buttons fill the width, two per row, 44px tall. */}
            {(canEdit || canDelete) && (
              <div className="flex flex-wrap items-center gap-2 max-md:[&>*]:h-11 max-md:[&>*]:min-w-[calc(50%-0.25rem)] max-md:[&>*]:flex-1 lg:shrink-0 lg:justify-end">
                {canDelete && (
                  <Button variant="ghost" icon={<Trash2 size={16} strokeWidth={1.5} />} onClick={() => setDeleting(true)}>
                    Delete
                  </Button>
                )}
                {canEdit && (
                  <Button variant="primary" icon={<Pencil size={16} strokeWidth={1.5} />} onClick={() => setEditing(true)}>
                    Edit tenant
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile label="Rent" loading={leases.isPending} value={active ? formatCurrency(active.rent) : noLease} note={active ? "Current lease" : "No active lease"} />
            <Tile
              label="Balance"
              loading={leases.isPending}
              value={active ? (credit ? `Credit ${formatCurrency(credit)}` : formatCurrency(active.balance)) : noLease}
              note={credit ? "Paid ahead" : due ? dueNote(due) : "No active lease"}
              className={cn(credit ? "text-success" : due?.kind === "overdue" && "text-danger")}
            />
            <Tile
              label="Lease ends"
              loading={leases.isPending}
              value={active ? formatDate(active.endDate) : noLease}
              note={active ? leaseEndsNote(active) : leases.isError ? "Couldn't load the leases" : "No active lease"}
            />
          </div>
        </div>
        <div className="px-6">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            className="border-b-0"
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "leases", label: "Leases", count: leases.data?.length },
              ...(docsHidden ? [] : [{ value: "documents" as const, label: "Documents", count: documents.data?.length }]),
            ]}
          />
        </div>
      </Card>

      {tab === "overview" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className={cn("flex min-w-0 flex-col gap-6", tenant.notes?.trim() ? "lg:col-span-8" : "lg:col-span-12")}>
            {active && <TenantCurrentLease lease={active} leaseState={leaseState} credit={credit} />}
            <TenantContactCard tenant={tenant} onEdit={canEdit ? () => setEditing(true) : undefined} />
            <TenantPersonalCard tenant={tenant} />
            {!tenant.notes?.trim() && <AddedByLine tenant={tenant} />}
          </div>
          {tenant.notes?.trim() && (
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
              <TenantNotesCard notes={tenant.notes} />
              <AddedByLine tenant={tenant} />
            </div>
          )}
        </div>
      ) : tab === "documents" ? (
        <DocumentsPanel target={{ owner: "tenants", ownerId: tenant.id }} emptyText="No documents for this tenant yet." />
      ) : (
        <TenantLeasesTab tenantId={tenant.id} query={leases} leaseState={leaseState} onAddLease={can(user, "lease.create") ? () => setAddingLease(true) : undefined} />
      )}

      {editing && <TenantFormModal tenantId={tenant.id} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetTenantId={tenant.id} onClose={() => setAddingLease(false)} />}
      <TenantDeleteDialog tenant={deleting ? tenant : null} onClose={() => setDeleting(false)} onDeleted={goBack} />
    </>
  );
}
