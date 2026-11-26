import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bath, CalendarCheck, CalendarClock, DoorOpen, FileText, History, Layers, Pencil, Plus, Ruler, Scale, Tag } from "lucide-react";
import { Avatar, Badge, Button, Caption, Dash, Num, Skeleton } from "@/components/atoms";
import { Card, EmptyState, IconTile, IconTileGrid, InlineError, ListCard, SectionCard, StatusBadge, Tabs } from "@/components/molecules";
import { CardList, DataTable, Drawer, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitStatusLabels, unitTypeLabels, unitLabel } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import { useDocuments } from "@/features/documents/hooks";
import { useLeases } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { OldLeaseModal } from "@/features/leases/OldLeaseModal";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { ContactActions } from "@/features/shared/ContactActions";
import { NotSet } from "@/features/shared/Missing";
import { useTenants } from "@/features/tenants/hooks";
import { primaryTenantName } from "@/features/properties/stats";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import { UnitFormModal } from "@/features/units/UnitFormModal";
import { floorAreaText, rentDiffNote, unitSummary } from "@/features/units/stats";
import type { Lease } from "@/types/lease";
import type { Unit } from "@/types/unit";

type Tab = "tenant" | "history" | "documents";

const leasePath = (l: Lease) => `/leases/${encodeURIComponent(l.id)}`;

const historyColumns: Column<Lease>[] = [
  { key: "period", header: "Period", cell: (l) => leasePeriod(l) ?? <Dash /> },
  { key: "tenant", header: "Tenant", cell: (l) => primaryTenantName(l) ?? <Dash /> },
  { key: "rent", header: "Rent", align: "right", cell: (l) => <Num>{formatCurrency(l.rent)}</Num> },
  { key: "status", header: "Status", cell: (l) => <LeaseBadge lease={l} /> },
];

export interface UnitDrawerProps {
  unit: Unit;
  propertyName: string;
  /** Router state for the lease links: where the lease page goes back to (Units, or the property page). */
  leaseFrom: LeasePageState;
  onClose: () => void;
}

/**
 * One unit (lg drawer): Tenant tab ("Current lease" card, "Unit" card with Edit unit, Description) and Lease history tab (GET /leases?unitId=).
 * "Open lease" and a history row click go to /leases/:id.
 * Footer: Delete (OWNER) and Edit unit. Mount it only while open; it closes itself after a delete.
 */
export function UnitDrawer({ unit, propertyName, leaseFrom, onClose }: UnitDrawerProps) {
  const navigate = useNavigate();
  const { me } = useAuth();
  const user = me!;
  const leases = useLeases({ unitId: unit.id });
  const documents = useDocuments({ owner: "units", ownerId: unit.id });
  const [tab, setTab] = useState<Tab>("tenant");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);
  const [addingOld, setAddingOld] = useState(false);

  const active = leases.data?.find((l) => l.status === "ACTIVE");
  const canEdit = can(user, "unit.edit");
  const canDelete = can(user, "unit.delete");
  const canAddLease = can(user, "lease.create");

  const isMobile = useIsMobile();
  const historyState = leases.isError ? "error" : leases.isPending ? "loading" : leases.data.length === 0 ? "empty" : "ideal";
  const historyEmpty = { title: "No leases yet", description: "No leases for this unit yet." };
  const historyError = { title: "Couldn't load leases", description: errorText(leases.error), onRetry: () => void leases.refetch() };

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={`${unitLabel(unit.unitNumber)}${propertyName ? `, ${propertyName}` : ""}`}
        description={unitSummary(unit)}
        status={<StatusBadge domain="unit" status={unit.status} />}
        tabs={
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "tenant", label: "Tenant" },
              { value: "history", label: "Lease history", count: leases.data?.length },
              { value: "documents", label: "Documents", count: documents.data?.length },
            ]}
          />
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
                  Edit unit
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {tab === "tenant" ? (
          <>
            {leases.isPending ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-24" />
              </div>
            ) : leases.isError ? (
              <InlineError title="Couldn't load the lease" description={errorText(leases.error)} onRetry={() => void leases.refetch()} />
            ) : active ? (
              <ActiveLease lease={active} unit={unit} leaseFrom={leaseFrom} />
            ) : (
              <Card padding="none">
                <EmptyState
                  icon={<FileText strokeWidth={1.5} />}
                  title="No active lease"
                  description={`This unit is ${unitStatusLabels[unit.status].toLowerCase()}.`}
                  action={
                    canAddLease ? (
                      <Button icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAddingLease(true)}>
                        Add lease
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            )}

            <SectionCard
              padding="compact"
              title="Unit"
              subtitle="Layout and listing"
              action={
                canEdit && (
                  <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setEditing(true)} className="max-md:h-11">
                    Edit unit
                  </Button>
                )
              }
            >
              <IconTileGrid>
                <IconTile icon={<DoorOpen strokeWidth={1.5} />} label="Type" value={unitTypeLabels[unit.unitType]} />
                <IconTile icon={<Bath strokeWidth={1.5} />} label="Bathrooms" value={unit.bathrooms ?? <NotSet />} />
                <IconTile icon={<Layers strokeWidth={1.5} />} label="Floor" value={unit.floor ?? <NotSet />} />
                <IconTile icon={<Ruler strokeWidth={1.5} />} label="Floor area" value={unit.floorArea === null ? <NotSet /> : <Num>{floorAreaText(unit.floorArea)}</Num>} />
                <IconTile icon={<Tag strokeWidth={1.5} />} label="Listed rent" value={unit.monthlyRent === null ? <NotSet /> : <Num>{formatCurrency(unit.monthlyRent)}</Num>} />
              </IconTileGrid>
            </SectionCard>
            {unit.description && (
              <SectionCard padding="compact" title="Description">
                <div className="rounded-control bg-surface-2 p-4 break-words whitespace-pre-line text-text-primary">{unit.description}</div>
              </SectionCard>
            )}
          </>
        ) : tab === "documents" ? (
          <DocumentsPanel
            target={{ owner: "units", ownerId: unit.id }}
            leaseState={leaseFrom}
            emptyText="No documents on this unit or its leases yet."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {canAddLease && (
              <div className="flex items-center justify-between gap-3">
                <Caption>Record a lease that ended before today, for the history.</Caption>
                <Button size="sm" icon={<History size={16} strokeWidth={1.5} />} onClick={() => setAddingOld(true)} className="shrink-0 max-md:h-11">
                  Add old lease
                </Button>
              </div>
            )}
            {isMobile ? (
          <CardList
            rows={leases.data ?? []}
            rowKey={(l) => l.id}
            caption="Lease history"
            skeletons={2}
            state={historyState}
            empty={historyEmpty}
            error={historyError}
            renderCard={(l) => (
              <ListCard
                href={leasePath(l)}
                openLabel={`Open lease ${l.leaseNumber}`}
                renderLink={(href, p) => <Link to={href} state={leaseFrom} {...p} />}
                title={primaryTenantName(l) ?? <span className="text-text-muted">No tenant</span>}
                subtitle={l.leaseNumber}
                badge={<LeaseBadge lease={l} />}
                amount={{ label: "Rent", value: <Num>{formatCurrency(l.rent)}</Num> }}
                facts={[{ label: "Period", value: leasePeriod(l) ?? <Dash /> }]}
              />
            )}
          />
        ) : (
          <DataTable
            columns={historyColumns}
            rows={leases.data ?? []}
            rowKey={(l) => l.id}
            onRowClick={(l) => void navigate(leasePath(l), { state: leaseFrom })}
            density="compact"
            caption="Lease history"
            state={historyState}
            empty={historyEmpty}
            error={historyError}
          />
            )}
          </div>
        )}
      </Drawer>

      {editing && <UnitFormModal unit={unit} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetUnit={unit} onClose={() => setAddingLease(false)} />}
      {addingOld && (
        <OldLeaseModal
          presetUnit={unit}
          presetUnitLine={`${unitLabel(unit.unitNumber)}${propertyName ? `, ${propertyName}` : ""}`}
          onClose={() => setAddingOld(false)}
        />
      )}
      <UnitDeleteDialog unit={deleting ? unit : null} propertyName={propertyName} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

/**
 * Tenant tab with an ACTIVE lease: "Current lease" card (lease number and period, Open lease) with the primary tenant tile
 * (payment badge, Call / Email / Copy; the phone from GET /tenants), then Rent / Balance / Lease ends tiles.
 */
function ActiveLease({ lease, unit, leaseFrom }: { lease: Lease; unit: Unit; leaseFrom: LeasePageState }) {
  const navigate = useNavigate();
  const tenants = useTenants();
  const tenant = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];
  const due = dueState(lease);
  const period = leasePeriod(lease);

  return (
    <SectionCard
      padding="compact"
      title="Current lease"
      subtitle={[`Lease ${lease.leaseNumber}`, period].filter(Boolean).join(" · ")}
      action={
        <Button size="sm" onClick={() => void navigate(leasePath(lease), { state: leaseFrom })} className="max-md:h-11">
          Open lease
        </Button>
      }
    >
      <IconTileGrid>
        <IconTile
          bareIcon
          icon={<Avatar name={tenant?.fullName ?? "-"} size={40} />}
          label="Primary tenant"
          value={tenant?.fullName ?? <NotSet />}
          badge={
            due.kind === "overdue" ? (
              <StatusBadge domain="rent" status="OVERDUE" />
            ) : due.kind === "today" ? (
              <Badge tone="warning">Due today</Badge>
            ) : (
              <LeaseBadge lease={lease} />
            )
          }
          action={tenant && <ContactActions name={tenant.fullName} phone={tenants.data?.find((x) => x.id === tenant.id)?.phone} email={tenant.email} />}
        />
        <IconTile icon={<CalendarClock strokeWidth={1.5} />} label="Current rent" value={<Num>{formatCurrency(lease.rent)}</Num>} note={rentDiffNote(lease.rent, unit.monthlyRent)} />
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
