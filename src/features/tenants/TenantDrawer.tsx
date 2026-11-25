import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, UserX } from "lucide-react";
import { Button, Caption, Dash, H3, Num, Skeleton } from "@/components/atoms";
import { Card, EmptyState, InlineError, KeyValueList, ListCard, Tabs } from "@/components/molecules";
import { CardList, DataTable, Drawer, type Column } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatCurrency, formatDate, formatTimestampDate, parseDateOnly } from "@/lib/format";
import { paymentFrequencyLabels, tenantTypeLabels, unitLabel } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can, roleLabel } from "@/features/auth/permissions";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { useDocuments } from "@/features/documents/hooks";
import { useLeases } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge, StatCard } from "@/features/leases/LeaseParts";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { ContactLink } from "@/features/shared/ContactLink";
import { NotProvided } from "@/features/shared/Missing";
import { useTenant } from "@/features/tenants/hooks";
import { TenantDeleteDialog } from "@/features/tenants/TenantDeleteDialog";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { TenantLeaseBadge } from "@/features/tenants/TenantParts";
import { preferredContactText, unitLine, type TenantRow } from "@/features/tenants/stats";
import type { Lease } from "@/types/lease";
import type { TenantDetail } from "@/types/tenant";

type Tab = "overview" | "leases" | "documents";

const leasePath = (l: Lease) => `/leases/${encodeURIComponent(l.id)}`;
/** Opened on the Tenants page: the lease page goes back there. */
const fromTenants: LeasePageState = { from: "tenants" };

const orDash = (value: string | null | undefined) => (value ? value : <Dash />);

export interface TenantDrawerProps {
  /** The list row: name, contact and the current lease (the drawer adds GET /tenants/:id and GET /leases?tenantId=). */
  row: TenantRow;
  /** Opened on the lease page of this lease: that lease just closes the drawer; another one opens without an origin (its parent is Leases). */
  onLeasePage?: string;
  onClose: () => void;
}

/**
 * One tenant (lg drawer): Overview (current ACTIVE lease cards, Details with the ID number) and Leases tabs.
 * "Open lease" and a Leases row click go to /leases/:id.
 * Footer: Delete (OWNER) and Edit tenant. Mount it only while open; it closes itself after a delete.
 */
export function TenantDrawer({ row, onLeasePage, onClose }: TenantDrawerProps) {
  const { me } = useAuth();
  const user = me!;
  const detail = useTenant(row.tenant.id);
  // Old (history-only) leases included.
  const leases = useLeases({ tenantId: row.tenant.id });
  const documents = useDocuments({ owner: "tenants", ownerId: row.tenant.id });
  const [chosenTab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);

  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  // A manager sees a tenant's documents only when the tenant is on a lease in their properties or they created them; else 404 (rules.md): hide the tab.
  const docsHidden = documents.error instanceof ApiError && documents.error.status === 404;
  const tab: Tab = docsHidden && chosenTab === "documents" ? "overview" : chosenTab;
  const tenant = detail.data ?? row.tenant;
  const { current } = row;
  const link: LeaseLink = { state: onLeasePage === undefined ? fromTenants : undefined, here: onLeasePage, onHere: onClose };
  const canEdit = can(user, "tenant.edit") && !notFound;
  const canDelete = can(user, "tenant.delete") && !notFound;

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={tenant.fullName}
        description={[tenantTypeLabels[tenant.tenantType], tenant.email, tenant.phone].filter(Boolean).join(" · ")}
        status={notFound ? undefined : <TenantLeaseBadge lease={current} />}
        tabs={
          notFound ? undefined : (
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "leases", label: "Leases", count: leases.data?.length },
                ...(docsHidden ? [] : [{ value: "documents" as const, label: "Documents", count: documents.data?.length }]),
              ]}
            />
          )
        }
        footer={
          canEdit || canDelete ? (
            <>
              {canDelete && (
                <Button variant="ghost" onClick={() => setDeleting(true)}>
                  Delete
                </Button>
              )}
              {canEdit && (
                <Button variant="primary" onClick={() => setEditing(true)}>
                  Edit tenant
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {notFound ? (
          <Card padding="none">
            <EmptyState icon={<UserX strokeWidth={1.5} />} title="Tenant not found" description="This tenant was deleted or doesn't exist." />
          </Card>
        ) : tab === "overview" ? (
          <>
            {current?.status === "ACTIVE" && <ActiveLease lease={current} link={link} />}

            <div className="flex flex-col gap-3">
              <H3>Details</H3>
              {detail.isPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-5" />
                  ))}
                </div>
              ) : detail.isError ? (
                <InlineError title="Couldn't load the tenant" description={errorText(detail.error)} onRetry={() => void detail.refetch()} />
              ) : (
                <Details tenant={detail.data} />
              )}
            </div>
          </>
        ) : tab === "documents" ? (
          <DocumentsPanel target={{ owner: "tenants", ownerId: row.tenant.id }} emptyText="No documents for this tenant yet." />
        ) : (
          <LeasesTab tenantId={row.tenant.id} query={leases} link={link} onAddLease={can(user, "lease.create") ? () => setAddingLease(true) : undefined} />
        )}
      </Drawer>

      {editing && <TenantFormModal tenantId={row.tenant.id} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetTenantId={row.tenant.id} onClose={() => setAddingLease(false)} />}
      <TenantDeleteDialog tenant={deleting ? row.tenant : null} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

/** How the drawer's leases open: the router state to send, and the lease already on screen (which only closes the drawer). */
interface LeaseLink {
  state: LeasePageState | undefined;
  here: string | undefined;
  onHere: () => void;
}

function useOpenLease({ state, here, onHere }: LeaseLink) {
  const navigate = useNavigate();
  return (lease: Lease) => (lease.id === here ? onHere() : void navigate(leasePath(lease), { state }));
}

/** Current ACTIVE lease: a summary card, then Rent / Balance / Lease ends cards (same notes as the unit drawer). */
function ActiveLease({ lease, link }: { lease: Lease; link: LeaseLink }) {
  const openLease = useOpenLease(link);
  const due = dueState(lease);
  return (
    <div className="flex flex-col gap-3">
      <Card padding="compact" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-text-primary">{unitLine(lease)}</div>
          <Caption className="block truncate">{[`Lease ${lease.leaseNumber}`, leasePeriod(lease)].filter(Boolean).join(" · ")}</Caption>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LeaseBadge lease={lease} />
          <Button size="sm" variant="ghost" onClick={() => openLease(lease)}>
            Open lease
          </Button>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Rent" value={formatCurrency(lease.rent)} note={paymentFrequencyLabels[lease.paymentFrequency]} />
        <StatCard
          label="Balance"
          value={formatCurrency(lease.balance)}
          note={dueNote(due)}
          className={due.kind === "overdue" ? "text-danger" : undefined}
        />
        <StatCard label="Lease ends" value={formatDate(lease.endDate)} note={leaseEndsNote(lease)} />
      </div>
    </div>
  );
}

/** The Details list. The ID / passport number is shown only here. */
function Details({ tenant }: { tenant: TenantDetail }) {
  return (
    <KeyValueList
      labelWidth={160}
      items={[
        { label: "Full name", value: tenant.fullName },
        { label: "Email", value: <ContactLink kind="email" value={tenant.email} wrap empty={<NotProvided />} /> },
        { label: "Phone", value: <ContactLink kind="phone" value={tenant.phone} empty={<NotProvided />} /> },
        { label: "ID / passport number", value: orDash(tenant.idNumber) },
        { label: "Address", value: orDash(tenant.address) },
        { label: "Tenant type", value: tenantTypeLabels[tenant.tenantType] },
        { label: "Move-in date", value: parseDateOnly(tenant.moveInDate) ? formatDate(tenant.moveInDate) : <Dash /> },
        { label: "Preferred contact", value: preferredContactText(tenant) },
        { label: "Notes", value: tenant.notes ? <span className="whitespace-pre-line">{tenant.notes}</span> : <Dash /> },
        // A long email wraps instead of widening the drawer on phones.
        { label: "Added by", value: <span className="wrap-anywhere">{`${tenant.createdBy.email} (${roleLabel(tenant.createdBy.role)})`}</span> },
        { label: "Added on", value: formatTimestampDate(tenant.createdAt) },
      ]}
    />
  );
}

/** GET /leases?tenantId=: every visible lease that includes the tenant (old ones too), with their role on it. "Add lease" (primary tenant preset) when allowed. */
function LeasesTab({ tenantId, query, link, onAddLease }: { tenantId: string; query: ReturnType<typeof useLeases>; link: LeaseLink; onAddLease?: () => void }) {
  const openLease = useOpenLease(link);
  const isMobile = useIsMobile();
  const leases = query.data ?? [];
  const state = query.isError ? "error" : query.isPending ? "loading" : leases.length === 0 ? "empty" : "ideal";
  const empty = { title: "No leases", description: "Not on any lease yet." };
  const error = { title: "Couldn't load leases", description: errorText(query.error), onRetry: () => void query.refetch() };
  const role = (l: Lease) => (l.tenants.find((t) => t.id === tenantId)?.isPrimary ? "Primary" : "Co-tenant");
  const columns: Column<Lease>[] = [
    { key: "number", header: "Lease", cell: (l) => <span className="font-semibold">{l.leaseNumber}</span> },
    {
      key: "unit",
      header: "Unit",
      cell: (l) => (
        <div className="min-w-0">
          <div>{unitLabel(l.unit.unitNumber)}</div>
          <Caption className="block truncate">{l.unit.property.name}</Caption>
        </div>
      ),
    },
    { key: "period", header: "Period", cell: (l) => leasePeriod(l) ?? <Dash /> },
    { key: "rent", header: "Rent", align: "right", cell: (l) => <Num>{formatCurrency(l.rent)}</Num> },
    { key: "status", header: "Status", cell: (l) => <LeaseBadge lease={l} /> },
    { key: "role", header: "Role", cell: role },
  ];
  return (
    <div className="flex flex-col gap-3">
      {onAddLease && (
        <Button className="self-end" icon={<Plus size={16} strokeWidth={1.5} />} onClick={onAddLease}>
          Add lease
        </Button>
      )}
      {isMobile ? (
        <CardList
          rows={leases}
          rowKey={(l) => l.id}
          caption="Leases"
          skeletons={2}
          state={state}
          empty={empty}
          error={error}
          renderCard={(l) => (
            <ListCard
              {...(l.id === link.here ? { onOpen: link.onHere } : { href: leasePath(l) })}
              openLabel={`Open lease ${l.leaseNumber}`}
              renderLink={(href, p) => <Link to={href} state={link.state} {...p} />}
              title={l.leaseNumber}
              subtitle={`${unitLabel(l.unit.unitNumber)} · ${l.unit.property.name}`}
              badge={<LeaseBadge lease={l} />}
              amount={{ label: "Rent", value: l.rent === null ? <Dash /> : <Num>{formatCurrency(l.rent)}</Num> }}
              facts={[
                { label: "Period", value: leasePeriod(l) ?? <Dash /> },
                { label: "Role", value: role(l) },
              ]}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={leases}
          rowKey={(l) => l.id}
          onRowClick={openLease}
          density="compact"
          caption="Leases"
          state={state}
          empty={empty}
          error={error}
        />
      )}
    </div>
  );
}
