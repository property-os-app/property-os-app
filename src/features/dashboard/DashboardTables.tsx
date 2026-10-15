import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar, Badge, Caption, Num } from "@/components/atoms";
import { Card, CardHeader } from "@/components/molecules";
import { DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { Section } from "@/features/dashboard/hooks";
import { expiresBadge } from "@/features/dashboard/stats";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { primaryTenant } from "@/features/leases/stats";
import { textLink } from "@/features/shared/linkClass";
import type { Lease } from "@/types/lease";
import type { RentRollRow } from "@/types/rentRoll";

/** Router state for rows opened here: the lease page shows "← Dashboard" and highlights Dashboard. */
const fromDashboard: LeasePageState = { from: "dashboard" };

function TenantCell({ name }: { name: string | undefined }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name ?? "-"} size={24} />
      <span className="truncate">{name ?? "No tenant"}</span>
    </span>
  );
}

function UnitCell({ unit, property }: { unit: string; property: string }) {
  return (
    <span className="block truncate text-text-secondary">
      {unit}, {property}
    </span>
  );
}

function TableCard({ title, viewAll, children }: { title: string; viewAll: string; children: ReactNode }) {
  return (
    <Card as="section" padding="none" aria-label={title} className="min-w-0">
      <div className="px-5 pt-5">
        <CardHeader
          title={title}
          action={
            <Link to={viewAll} className={textLink}>
              View all
            </Link>
          }
        />
      </div>
      {children}
    </Card>
  );
}

const tableState = (s: Section<unknown[]>) => (s.error ? "error" : s.isPending ? "loading" : s.data!.length === 0 ? "empty" : "ideal");

/** ACTIVE leases past their end date or ending within 60 days, soonest first (max 5). Row: the lease page. */
export function AtRiskLeasesTable({ atRisk }: { atRisk: Section<Lease[]> }) {
  const navigate = useNavigate();
  const columns: Column<Lease>[] = [
    { key: "tenant", header: "Tenant", className: "max-w-40", cell: (l) => <TenantCell name={primaryTenant(l)?.fullName} /> },
    { key: "unit", header: "Unit", className: "max-w-40", cell: (l) => <UnitCell unit={l.unit.unitNumber} property={l.unit.property.name} /> },
    {
      key: "expires",
      header: "Expires",
      align: "right",
      cell: (l) => {
        const b = expiresBadge(l);
        return <Badge tone={b.tone}>{b.text}</Badge>;
      },
    },
  ];
  return (
    <TableCard title="At-risk leases" viewAll="/leases">
      <DataTable
        className="rounded-none border-0 border-t"
        columns={columns}
        rows={atRisk.data ?? []}
        rowKey={(l) => l.id}
        onRowClick={(l) => void navigate(`/leases/${encodeURIComponent(l.id)}`, { state: fromDashboard })}
        density="compact"
        caption="At-risk leases"
        state={tableState(atRisk)}
        empty={{ title: "Nothing at risk", description: "No leases ending in the next 60 days." }}
        error={{ title: "Couldn't load leases", description: errorText(atRisk.error), onRetry: atRisk.retry }}
      />
    </TableCard>
  );
}

/** OVERDUE rows of the month, oldest unpaid first (max 5). Row: the lease page, Ledger tab. */
export function OverdueRentTable({ overdue }: { overdue: Section<{ row: RentRollRow; note: string | null }[]> }) {
  const navigate = useNavigate();
  const columns: Column<{ row: RentRollRow; note: string | null }>[] = [
    { key: "tenant", header: "Tenant", className: "max-w-40", cell: ({ row }) => <TenantCell name={row.primaryTenant?.fullName} /> },
    { key: "unit", header: "Unit", className: "max-w-40", cell: ({ row }) => <UnitCell unit={row.unit.unitNumber} property={row.unit.property.name} /> },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      cell: ({ row, note }) => (
        <span className="flex flex-col items-end">
          <Num className="font-semibold text-danger">{formatCurrency(row.balance)}</Num>
          {note && <Caption>{note}</Caption>}
        </span>
      ),
    },
  ];
  return (
    <TableCard title="Overdue rent" viewAll="/rent-roll">
      <DataTable
        className="rounded-none border-0 border-t"
        columns={columns}
        rows={overdue.data ?? []}
        rowKey={({ row }) => row.leaseId}
        onRowClick={({ row }) => void navigate(`/leases/${encodeURIComponent(row.leaseId)}?tab=ledger`, { state: fromDashboard })}
        density="compact"
        caption="Overdue rent"
        state={tableState(overdue)}
        empty={{ title: "All paid up", description: "Nobody is overdue this month." }}
        error={{ title: "Couldn't load the rent roll", description: errorText(overdue.error), onRetry: overdue.retry }}
      />
    </TableCard>
  );
}
