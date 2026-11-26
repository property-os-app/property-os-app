import { useMemo, useState } from "react";
import { Avatar, Badge, Small } from "@/components/atoms";
import { IconTile, IconTileGrid, SectionCard } from "@/components/molecules";
import { plural } from "@/lib/labels";
import { useLeases } from "@/features/leases/hooks";
import { ContactActions } from "@/features/shared/ContactActions";
import { useTenants } from "@/features/tenants/hooks";
import { buildTenantRows } from "@/features/tenants/stats";
import { TenantDrawer } from "@/features/tenants/TenantDrawer";
import type { Lease } from "@/types/lease";

/**
 * Details tab "Leaseholders" card: a tile per tenant on the lease (primary first) with Call / Email / Copy. A tile opens the
 * tenant drawer over the page once GET /tenants (phones too) and GET /leases have loaded; until then, or if one fails, it is plain.
 */
export function LeaseholdersCard({ lease }: { lease: Lease }) {
  const tenants = useTenants();
  const leases = useLeases();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => (tenants.data && leases.data ? buildTenantRows(tenants.data, leases.data) : undefined), [tenants.data, leases.data]);
  const openRow = rows?.find((r) => r.tenant.id === openId);

  return (
    <SectionCard title="Leaseholders" subtitle={plural(lease.tenants.length, "occupant")}>
      {lease.tenants.length === 0 ? (
        <Small>No tenants yet. Add a primary tenant with Edit.</Small>
      ) : (
        <IconTileGrid>
          {lease.tenants.map((t) => {
            const row = rows?.find((r) => r.tenant.id === t.id);
            return (
              <IconTile
                key={t.id}
                bareIcon
                icon={<Avatar name={t.fullName} size={40} />}
                label="Tenant"
                value={t.fullName}
                badge={
                  <Badge tone={t.isPrimary ? "info" : "neutral"} dot={false}>
                    {t.isPrimary ? "Primary" : "Co-tenant"}
                  </Badge>
                }
                action={<ContactActions name={t.fullName} phone={tenants.data?.find((x) => x.id === t.id)?.phone} email={t.email} />}
                onOpen={row ? () => setOpenId(t.id) : undefined}
                openLabel={`Open tenant ${t.fullName}`}
              />
            );
          })}
        </IconTileGrid>
      )}
      {openRow && <TenantDrawer row={openRow} onLeasePage={lease.id} onClose={() => setOpenId(null)} />}
    </SectionCard>
  );
}
