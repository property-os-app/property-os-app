import { Link, useNavigate } from "react-router";
import { History } from "lucide-react";
import { Button, Caption, Dash, Num } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";
import type { useLeases } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { leasePeriod } from "@/features/leases/stats";
import { primaryTenantName } from "@/features/properties/stats";
import type { Lease } from "@/types/lease";

const leasePath = (l: Lease) => `/leases/${encodeURIComponent(l.id)}`;

const historyColumns: Column<Lease>[] = [
  { key: "period", header: "Period", cell: (l) => leasePeriod(l) ?? <Dash /> },
  { key: "tenant", header: "Tenant", cell: (l) => primaryTenantName(l) ?? <Dash /> },
  { key: "rent", header: "Rent", align: "right", cell: (l) => <Num>{formatCurrency(l.rent)}</Num> },
  { key: "status", header: "Status", cell: (l) => <LeaseBadge lease={l} /> },
];

/**
 * GET /leases?unitId=: every lease of the unit (old ones show "Old lease", cancelled ones "Cancelled"); cards on phones.
 * A row opens the lease with `leaseState` (Back returns here). "Add old lease" with `onAddOld`.
 */
export function UnitLeaseHistory({ query, leaseState, onAddOld }: { query: ReturnType<typeof useLeases>; leaseState: LeasePageState; onAddOld?: () => void }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const state = query.isError ? "error" : query.isPending ? "loading" : query.data.length === 0 ? "empty" : "ideal";
  const empty = { title: "No leases yet", description: "No leases for this unit yet." };
  const error = { title: "Couldn't load leases", description: errorText(query.error), onRetry: () => void query.refetch() };

  return (
    <div className="flex flex-col gap-3">
      {onAddOld && (
        <div className="flex items-center justify-between gap-3">
          <Caption>Record a lease that ended before today, for the history.</Caption>
          <Button size="sm" icon={<History size={16} strokeWidth={1.5} />} onClick={onAddOld} className="shrink-0 max-md:h-11">
            Add old lease
          </Button>
        </div>
      )}
      {isMobile ? (
        <CardList
          rows={query.data ?? []}
          rowKey={(l) => l.id}
          caption="Lease history"
          skeletons={2}
          state={state}
          empty={empty}
          error={error}
          renderCard={(l) => (
            <ListCard
              href={leasePath(l)}
              openLabel={`Open lease ${l.leaseNumber}`}
              renderLink={(href, p) => <Link to={href} state={leaseState} {...p} />}
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
          rows={query.data ?? []}
          rowKey={(l) => l.id}
          onRowClick={(l) => void navigate(leasePath(l), { state: leaseState })}
          density="compact"
          caption="Lease history"
          state={state}
          empty={empty}
          error={error}
        />
      )}
    </div>
  );
}
