import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Avatar, Badge, Caption, Num } from "@/components/atoms";
import { Card, CardHeader, ListCard, StatusBadge } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";
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

/** Router link for a flat card, with the "← Dashboard" state. */
const dashboardLink = (href: string, p: { className: string; "aria-label": string | undefined }) => <Link to={href} state={fromDashboard} {...p} />;

/** ACTIVE leases past their end date or ending within 60 days, soonest first (max 5). Row / card: the lease page. Flat cards on phones. */
export function AtRiskLeasesTable({ atRisk }: { atRisk: Section<Lease[]> }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const empty = { title: "Nothing at risk", description: "No leases ending in the next 60 days." };
  const error = { title: "Couldn't load leases", description: errorText(atRisk.error), onRetry: atRisk.retry };
  if (isMobile) {
    return (
      <TableCard title="At-risk leases" viewAll="/leases">
        <CardList
          flat
          className="border-t border-border-subtle"
          rows={atRisk.data ?? []}
          rowKey={(l) => l.id}
          caption="At-risk leases"
          skeletons={3}
          state={tableState(atRisk)}
          empty={empty}
          error={error}
          renderCard={(l) => {
            const name = primaryTenant(l)?.fullName;
            const b = expiresBadge(l);
            return (
              <ListCard
                flat
                href={`/leases/${encodeURIComponent(l.id)}`}
                openLabel={`Open lease ${l.leaseNumber}${name ? `, ${name}` : ""}`}
                renderLink={dashboardLink}
                leading={<Avatar name={name ?? "-"} size={32} />}
                title={name ?? <span className="text-text-muted">No tenant</span>}
                subtitle={`Unit ${l.unit.unitNumber} · ${l.unit.property.name}`}
                badge={<Badge tone={b.tone}>{b.text}</Badge>}
              />
            );
          }}
        />
      </TableCard>
    );
  }
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
        empty={empty}
        error={error}
      />
    </TableCard>
  );
}

/** OVERDUE rows of the month, oldest unpaid first (max 5). Row / card: the lease page, Ledger tab. Flat cards on phones (red strip: behind on rent). */
export function OverdueRentTable({ overdue }: { overdue: Section<{ row: RentRollRow; note: string | null }[]> }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const empty = { title: "All paid up", description: "Nobody is overdue this month." };
  const error = { title: "Couldn't load the rent roll", description: errorText(overdue.error), onRetry: overdue.retry };
  if (isMobile) {
    return (
      <TableCard title="Overdue rent" viewAll="/rent-roll">
        <CardList
          flat
          className="border-t border-border-subtle"
          rows={overdue.data ?? []}
          rowKey={({ row }) => row.leaseId}
          caption="Overdue rent"
          skeletons={3}
          state={tableState(overdue)}
          empty={empty}
          error={error}
          renderCard={({ row, note }) => {
            const name = row.primaryTenant?.fullName;
            return (
              <ListCard
                flat
                strip
                href={`/leases/${encodeURIComponent(row.leaseId)}?tab=ledger`}
                openLabel={`Open ledger for lease ${row.leaseNumber}${name ? `, ${name}` : ""}`}
                renderLink={dashboardLink}
                leading={<Avatar name={name ?? "-"} size={32} />}
                title={name ?? <span className="text-text-muted">No tenant</span>}
                subtitle={`Unit ${row.unit.unitNumber} · ${row.unit.property.name}`}
                badge={<StatusBadge domain="rent" status="OVERDUE" />}
                amount={{ label: "Balance", value: <Num className="text-danger">{formatCurrency(row.balance)}</Num>, caption: note ?? undefined }}
              />
            );
          }}
        />
      </TableCard>
    );
  }
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
        empty={empty}
        error={error}
      />
    </TableCard>
  );
}
