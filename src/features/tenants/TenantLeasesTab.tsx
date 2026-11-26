import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { Button, Caption, Dash, Num } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { unitLabel } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import type { useLeases } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { leasePeriod } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

const leasePath = (l: Lease) => `/leases/${encodeURIComponent(l.id)}`;

/**
 * GET /leases?tenantId=: every visible lease that includes the tenant (old ones too), with their role on it; cards on
 * phones. A row opens the lease with `leaseState` (Back returns here). "Add lease" (primary tenant preset) with `onAddLease`.
 */
export function TenantLeasesTab({
  tenantId,
  query,
  leaseState,
  onAddLease,
}: {
  tenantId: string;
  query: ReturnType<typeof useLeases>;
  leaseState: LeasePageState;
  onAddLease?: () => void;
}) {
  const navigate = useNavigate();
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
        <Button className="self-end max-md:h-11" icon={<Plus size={16} strokeWidth={1.5} />} onClick={onAddLease}>
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
              href={leasePath(l)}
              openLabel={`Open lease ${l.leaseNumber}`}
              renderLink={(href, p) => <Link to={href} state={leaseState} {...p} />}
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
          onRowClick={(l) => void navigate(leasePath(l), { state: leaseState })}
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
