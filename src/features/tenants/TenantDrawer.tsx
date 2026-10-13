import { useState } from "react";
import { Plus, UserX } from "lucide-react";
import { Button, Caption, Dash, H3, Num, Skeleton } from "@/components/atoms";
import { Card, EmptyState, InlineError, KeyValueList, Tabs } from "@/components/molecules";
import { DataTable, Drawer, type Column } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatCurrency, formatDate, formatTimestampDate, parseDateOnly } from "@/lib/format";
import { contactMethodLabels, paymentFrequencyLabels, tenantTypeLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can, roleLabel } from "@/features/auth/permissions";
import { LeaseBadge, StatCard } from "@/features/leases/LeaseParts";
import { LeaseWizard } from "@/features/leases/LeaseWizard";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { useTenant } from "@/features/tenants/hooks";
import { TenantDeleteDialog } from "@/features/tenants/TenantDeleteDialog";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { TenantLeaseBadge } from "@/features/tenants/TenantParts";
import { unitLine, type TenantRow } from "@/features/tenants/stats";
import type { Lease } from "@/types/lease";
import type { TenantDetail } from "@/types/tenant";

type Tab = "overview" | "leases";

const orDash = (value: string | null | undefined) => (value ? value : <Dash />);

export interface TenantDrawerProps {
  /** The list row: name, contact and the leases this user can see (the drawer adds GET /tenants/:id). */
  row: TenantRow;
  onClose: () => void;
}

/**
 * One tenant (lg drawer): Overview (current ACTIVE lease cards, Details with the ID number) and Leases tabs.
 * Footer: Delete (OWNER) and Edit tenant. Mount it only while open; it closes itself after a delete.
 */
export function TenantDrawer({ row, onClose }: TenantDrawerProps) {
  const { me } = useAuth();
  const role = me!.role;
  const detail = useTenant(row.tenant.id);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingLease, setAddingLease] = useState(false);

  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  const tenant = detail.data ?? row.tenant;
  const { current, leases } = row;
  const canEdit = can(role, "tenant.edit") && !notFound;
  const canDelete = can(role, "tenant.delete") && !notFound;

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={tenant.fullName}
        description={[tenantTypeLabels[tenant.tenantType], tenant.email, tenant.phone].join(" · ")}
        status={notFound ? undefined : <TenantLeaseBadge lease={current} />}
        tabs={
          notFound ? undefined : (
            <Tabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "leases", label: "Leases", count: leases.length },
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
            {current?.status === "ACTIVE" && <ActiveLease lease={current} />}

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
        ) : (
          <LeasesTab tenantId={row.tenant.id} leases={leases} onAddLease={can(role, "lease.create") ? () => setAddingLease(true) : undefined} />
        )}
      </Drawer>

      {editing && <TenantFormModal tenantId={row.tenant.id} onClose={() => setEditing(false)} />}
      {addingLease && <LeaseWizard presetTenantId={row.tenant.id} onClose={() => setAddingLease(false)} />}
      <TenantDeleteDialog tenant={deleting ? row.tenant : null} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

/** Current ACTIVE lease: a summary card, then Rent / Balance / Lease ends cards (same notes as the unit drawer). */
function ActiveLease({ lease }: { lease: Lease }) {
  const due = dueState(lease);
  return (
    <div className="flex flex-col gap-3">
      <Card padding="compact" className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-text-primary">{unitLine(lease)}</div>
          <Caption className="block truncate">{[`Lease ${lease.leaseNumber}`, leasePeriod(lease)].filter(Boolean).join(" · ")}</Caption>
        </div>
        <LeaseBadge lease={lease} />
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
        { label: "Email", value: <span className="break-all">{tenant.email}</span> },
        { label: "Phone", value: tenant.phone },
        { label: "ID / passport number", value: orDash(tenant.idNumber) },
        { label: "Address", value: orDash(tenant.address) },
        { label: "Tenant type", value: tenantTypeLabels[tenant.tenantType] },
        { label: "Move-in date", value: parseDateOnly(tenant.moveInDate) ? formatDate(tenant.moveInDate) : <Dash /> },
        { label: "Preferred contact", value: contactMethodLabels[tenant.preferredContactMethod] },
        { label: "Notes", value: tenant.notes ? <span className="whitespace-pre-line">{tenant.notes}</span> : <Dash /> },
        { label: "Added by", value: `${tenant.createdBy.email} (${roleLabel(tenant.createdBy.role)})` },
        { label: "Added on", value: formatTimestampDate(tenant.createdAt) },
      ]}
    />
  );
}

/** Every visible lease that includes the tenant, with their role on it. "Add lease" (primary tenant preset) when allowed. */
function LeasesTab({ tenantId, leases, onAddLease }: { tenantId: string; leases: Lease[]; onAddLease?: () => void }) {
  const columns: Column<Lease>[] = [
    { key: "number", header: "Lease", cell: (l) => <span className="font-semibold">{l.leaseNumber}</span> },
    {
      key: "unit",
      header: "Unit",
      cell: (l) => (
        <div className="min-w-0">
          <div>Unit {l.unit.unitNumber}</div>
          <Caption className="block truncate">{l.unit.property.name}</Caption>
        </div>
      ),
    },
    { key: "period", header: "Period", cell: (l) => leasePeriod(l) ?? <Dash /> },
    { key: "rent", header: "Rent", align: "right", cell: (l) => <Num>{formatCurrency(l.rent)}</Num> },
    { key: "status", header: "Status", cell: (l) => <LeaseBadge lease={l} /> },
    { key: "role", header: "Role", cell: (l) => (l.tenants.find((t) => t.id === tenantId)?.isPrimary ? "Primary" : "Co-tenant") },
  ];
  return (
    <div className="flex flex-col gap-3">
      {onAddLease && (
        <Button className="self-end" icon={<Plus size={16} strokeWidth={1.5} />} onClick={onAddLease}>
          Add lease
        </Button>
      )}
      <DataTable
        columns={columns}
        rows={leases}
        rowKey={(l) => l.id}
        density="compact"
        caption="Leases"
        state={leases.length === 0 ? "empty" : "ideal"}
        empty={{ title: "No leases", description: "Not on any lease yet." }}
      />
    </div>
  );
}
