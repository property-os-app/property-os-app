import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CalendarCheck, CalendarClock, CalendarDays, IdCard, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Scale, User, Users, UserX } from "lucide-react";
import { Button, Caption, Dash, Num, Skeleton } from "@/components/atoms";
import { Card, EmptyState, IconTile, IconTileGrid, InlineError, ListCard, SectionCard, Tabs } from "@/components/molecules";
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
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { ContactActions } from "@/features/shared/ContactActions";
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

const orNotProvided = (value: string | null | undefined) => (value?.trim() ? value : <NotProvided />);

export interface TenantDrawerProps {
  /** The list row: name, contact and the current lease (the drawer adds GET /tenants/:id and GET /leases?tenantId=). */
  row: TenantRow;
  /** Opened on the lease page of this lease: that lease just closes the drawer; another one opens without an origin (its parent is Leases). */
  onLeasePage?: string;
  onClose: () => void;
}

/**
 * One tenant (lg drawer): Overview ("Current lease" card, Contact with Edit tenant, Personal with the ID number, Notes,
 * "Added by" line) and Leases tabs.
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

            {detail.isPending ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
            ) : detail.isError ? (
              <InlineError title="Couldn't load the tenant" description={errorText(detail.error)} onRetry={() => void detail.refetch()} />
            ) : (
              <Details tenant={detail.data} onEdit={canEdit ? () => setEditing(true) : undefined} />
            )}
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

/** Current ACTIVE lease: "Current lease" card (unit, lease number and period, Open lease) with Rent / Balance / Lease ends tiles (same notes as the unit drawer). */
function ActiveLease({ lease, link }: { lease: Lease; link: LeaseLink }) {
  const openLease = useOpenLease(link);
  const due = dueState(lease);
  return (
    <SectionCard
      padding="compact"
      title="Current lease"
      subtitle={[unitLine(lease), `Lease ${lease.leaseNumber}`, leasePeriod(lease)].filter(Boolean).join(" · ")}
      action={
        <>
          <LeaseBadge lease={lease} />
          <Button size="sm" onClick={() => openLease(lease)} className="max-md:h-11">
            Open lease
          </Button>
        </>
      }
    >
      <IconTileGrid>
        <IconTile icon={<CalendarClock strokeWidth={1.5} />} label="Rent" value={<Num>{formatCurrency(lease.rent)}</Num>} note={paymentFrequencyLabels[lease.paymentFrequency]} />
        <IconTile
          icon={<Scale strokeWidth={1.5} />}
          label="Balance"
          value={<Num>{formatCurrency(lease.balance)}</Num>}
          valueClassName={due.kind === "overdue" ? "text-danger" : undefined}
          note={dueNote(due)}
        />
        <IconTile icon={<CalendarCheck strokeWidth={1.5} />} label="Lease ends" value={formatDate(lease.endDate)} note={leaseEndsNote(lease)} />
      </IconTileGrid>
    </SectionCard>
  );
}

/**
 * Contact (Edit tenant with tenant.edit), Personal (the ID / passport number is shown only here), Notes (hidden when
 * empty) and a muted "Added by" line. Missing values read "Not provided".
 */
function Details({ tenant, onEdit }: { tenant: TenantDetail; onEdit?: () => void }) {
  const email = tenant.email?.trim() ? tenant.email : null;
  const phone = tenant.phone?.trim() ? tenant.phone : null;
  return (
    <>
      <SectionCard
        padding="compact"
        title="Contact"
        subtitle="How to reach them"
        action={
          onEdit && (
            <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={onEdit} className="max-md:h-11">
              Edit tenant
            </Button>
          )
        }
      >
        <IconTileGrid>
          <IconTile
            icon={<Mail strokeWidth={1.5} />}
            label="Email"
            value={email ?? <NotProvided />}
            action={email ? <ContactActions name={tenant.fullName} phone={null} email={email} /> : undefined}
          />
          <IconTile
            icon={<Phone strokeWidth={1.5} />}
            label="Phone"
            value={phone ?? <NotProvided />}
            action={phone ? <ContactActions name={tenant.fullName} phone={phone} email={null} /> : undefined}
          />
          <IconTile icon={<MessageSquare strokeWidth={1.5} />} label="Preferred contact" value={preferredContactText(tenant)} />
          <IconTile icon={<MapPin strokeWidth={1.5} />} label="Address" value={orNotProvided(tenant.address)} />
        </IconTileGrid>
      </SectionCard>

      <SectionCard padding="compact" title="Personal" subtitle="Identity and move-in">
        <IconTileGrid>
          <IconTile icon={<User strokeWidth={1.5} />} label="Full name" value={tenant.fullName} />
          <IconTile icon={<Users strokeWidth={1.5} />} label="Tenant type" value={tenantTypeLabels[tenant.tenantType]} />
          <IconTile icon={<IdCard strokeWidth={1.5} />} label="ID / passport number" value={orNotProvided(tenant.idNumber)} />
          <IconTile
            icon={<CalendarDays strokeWidth={1.5} />}
            label="Move-in date"
            value={parseDateOnly(tenant.moveInDate) ? formatDate(tenant.moveInDate) : <NotProvided />}
          />
        </IconTileGrid>
      </SectionCard>

      {tenant.notes?.trim() && (
        <SectionCard padding="compact" title="Notes">
          <div className="rounded-control bg-surface-2 p-4 break-words whitespace-pre-line text-text-primary">{tenant.notes}</div>
        </SectionCard>
      )}

      {/* A long email wraps instead of widening the drawer on phones. */}
      <Caption className="block wrap-anywhere">
        Added by {tenant.createdBy.email} ({roleLabel(tenant.createdBy.role)}) on {formatTimestampDate(tenant.createdAt)}
      </Caption>
    </>
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
