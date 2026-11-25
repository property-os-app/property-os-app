import { useMemo, useState } from "react";
import { Avatar, Badge, H3, Small } from "@/components/atoms";
import { Card, CardHeader } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { useLeases } from "@/features/leases/hooks";
import { ContactActions } from "@/features/shared/ContactActions";
import { useTenants } from "@/features/tenants/hooks";
import { buildTenantRows } from "@/features/tenants/stats";
import { TenantDrawer } from "@/features/tenants/TenantDrawer";
import type { Lease } from "@/types/lease";

/**
 * Details tab card: everyone on the lease (primary first), with Call / Email / Copy buttons. A row opens the tenant drawer
 * over the page once GET /tenants (phones too) and GET /leases have loaded; until then, or if one fails, it is plain.
 */
export function PeopleCard({ lease }: { lease: Lease }) {
  const tenants = useTenants();
  const leases = useLeases();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => (tenants.data && leases.data ? buildTenantRows(tenants.data, leases.data) : undefined), [tenants.data, leases.data]);
  const openRow = rows?.find((r) => r.tenant.id === openId);

  return (
    // No padding but not padding="none": that clips, and the ⋮ menu of the last row reaches past the card.
    <Card className="p-0">
      <CardHeader
        className="mb-0 px-6 pt-6 pb-3"
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <H3>People</H3>
            <Small>{lease.tenants.length} on this lease</Small>
          </span>
        }
      />
      {lease.tenants.length === 0 ? (
        <Small className="block px-6 pb-6">No tenants yet. Add a primary tenant with Edit.</Small>
      ) : (
        <ul className="m-0 list-none divide-y divide-border-subtle border-t border-border-subtle p-0">
          {lease.tenants.map((t) => {
            const row = rows?.find((r) => r.tenant.id === t.id);
            return (
              <li
                key={t.id}
                className={cn("relative flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3 last:rounded-b-card", row && "transition-colors duration-fast hover:bg-surface-3")}
              >
                {row && (
                  <button
                    type="button"
                    aria-label={`Open tenant ${t.fullName}`}
                    onClick={() => setOpenId(t.id)}
                    className="absolute inset-0 cursor-pointer rounded-control focus-visible:focus-ring-tight focus-visible:[outline-offset:-2px]"
                  />
                )}
                <div className="pointer-events-none relative flex min-w-0 flex-1 items-center gap-3 max-md:basis-full">
                  <span className="shrink-0">
                    <Avatar name={t.fullName} size={40} />
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words font-semibold text-text-primary">{t.fullName}</span>
                    <Badge tone={t.isPrimary ? "info" : "neutral"} dot={false}>
                      {t.isPrimary ? "Primary" : "Co-tenant"}
                    </Badge>
                  </div>
                </div>
                {/* Phones: on their own line, under the name (40px avatar + 12px gap, minus the icon's inner space). */}
                <div className="pointer-events-none max-md:pl-10">
                  <ContactActions name={t.fullName} phone={tenants.data?.find((x) => x.id === t.id)?.phone} email={t.email} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {openRow && <TenantDrawer row={openRow} onLeasePage={lease.id} onClose={() => setOpenId(null)} />}
    </Card>
  );
}
