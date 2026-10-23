import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { FileText, Plus } from "lucide-react";
import { Avatar, Badge, Button, Caption, Dash, H3, Num, Skeleton } from "@/components/atoms";
import { Card, EmptyState, InlineError, KeyValueList, ListCard, StatusBadge, Tabs } from "@/components/molecules";
import { CardList, DataTable, Drawer, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitStatusLabels, unitTypeLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeases } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge, StatCard } from "@/features/leases/LeaseParts";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { primaryTenantName } from "@/features/properties/stats";
import { UnitDeleteDialog } from "@/features/units/UnitDeleteDialog";
import { UnitFormModal } from "@/features/units/UnitFormModal";
import { rentDiffNote, unitSummary } from "@/features/units/stats";
import type { Lease } from "@/types/lease";
import type { Unit } from "@/types/unit";

type Tab = "tenant" | "history";

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
 * One unit (lg drawer): Tenant tab (active lease, rent/balance/end cards, details) and Lease history tab (GET /leases?unitId=).
 * "Open lease" and a history row click go to /leases/:id.
 * Footer: Delete (OWNER) and Edit unit. Mount it only while open; it closes itself after a delete.
 */
export function UnitDrawer({ unit, propertyName, leaseFrom, onClose }: UnitDrawerProps) {
  const navigate = useNavigate();
  const { me } = useAuth();
  const user = me!;
  const leases = useLeases({ unitId: unit.id });
  const [tab, setTab] = useState<Tab>("tenant");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);

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
        title={`Unit ${unit.unitNumber}${propertyName ? `, ${propertyName}` : ""}`}
        description={unitSummary(unit)}
        status={<StatusBadge domain="unit" status={unit.status} />}
        tabs={
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "tenant", label: "Tenant" },
              { value: "history", label: "Lease history", count: leases.data?.length },
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

            <div className="flex flex-col gap-3">
              <H3>Details</H3>
              <KeyValueList
                labelWidth={112}
                items={[
                  { label: "Type", value: unitTypeLabels[unit.unitType] },
                  { label: "Bathrooms", value: unit.bathrooms ?? <Dash /> },
                  { label: "Floor", value: unit.floor ?? <Dash /> },
                  { label: "Floor area", value: <Num>{unit.floorArea.toLocaleString("en-US")} sq ft</Num> },
                  { label: "Listed rent", value: <Num>{formatCurrency(unit.monthlyRent)}</Num> },
                  { label: "Description", value: unit.description ? <span className="whitespace-pre-line">{unit.description}</span> : <Dash /> },
                ]}
              />
            </div>
          </>
        ) : isMobile ? (
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
      </Drawer>

      {editing && <UnitFormModal unit={unit} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetUnit={unit} onClose={() => setAddingLease(false)} />}
      <UnitDeleteDialog unit={deleting ? unit : null} propertyName={propertyName} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

/** Tenant tab with an ACTIVE lease: tenant card with the payment badge, then rent / balance / lease end cards. */
function ActiveLease({ lease, unit, leaseFrom }: { lease: Lease; unit: Unit; leaseFrom: LeasePageState }) {
  const navigate = useNavigate();
  const tenant = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];
  const due = dueState(lease);
  const period = leasePeriod(lease);

  return (
    <div className="flex flex-col gap-3">
      <Card padding="compact" className="flex items-center gap-3">
        <Avatar name={tenant?.fullName ?? "-"} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-text-primary">{tenant?.fullName ?? "No primary tenant"}</div>
          <Caption className="block truncate">
            {[`Lease ${lease.leaseNumber}`, period, tenant?.email].filter(Boolean).join(" · ")}
          </Caption>
        </div>
        {due.kind === "overdue" ? (
          <StatusBadge domain="rent" status="OVERDUE" />
        ) : due.kind === "today" ? (
          <Badge tone="warning">Due today</Badge>
        ) : (
          <LeaseBadge lease={lease} />
        )}
        <Button size="sm" variant="ghost" onClick={() => void navigate(leasePath(lease), { state: leaseFrom })}>
          Open lease
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Current rent" value={formatCurrency(lease.rent)} note={rentDiffNote(lease.rent, unit.monthlyRent)} />
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
