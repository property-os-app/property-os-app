import { useNavigate } from "react-router";
import { Avatar, Badge, Small } from "@/components/atoms";
import { IconTile, IconTileGrid, SectionCard } from "@/components/molecules";
import { plural } from "@/lib/labels";
import { ContactActions } from "@/features/shared/ContactActions";
import { useTenants } from "@/features/tenants/hooks";
import { tenantFromLease } from "@/features/tenants/origin";
import type { Lease } from "@/types/lease";

/**
 * Details tab "Leaseholders" card: a tile per tenant on the lease (primary first) with Call / Email / Copy (phones from
 * GET /tenants). A tile opens the tenant page; Back returns to this lease.
 */
export function LeaseholdersCard({ lease }: { lease: Lease }) {
  const tenants = useTenants();
  const navigate = useNavigate();
  const open = (tenantId: string) => {
    const { to, state } = tenantFromLease(tenantId, lease);
    void navigate(to, { state });
  };

  return (
    <SectionCard title="Leaseholders" subtitle={plural(lease.tenants.length, "occupant")}>
      {lease.tenants.length === 0 ? (
        <Small>No tenants yet. Add a primary tenant with Edit.</Small>
      ) : (
        <IconTileGrid>
          {lease.tenants.map((t) => {
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
                onOpen={() => open(t.id)}
                openLabel={`Open tenant ${t.fullName}`}
              />
            );
          })}
        </IconTileGrid>
      )}
    </SectionCard>
  );
}
