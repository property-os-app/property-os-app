import { useNavigate } from "react-router";
import { Avatar, Badge, Small } from "@/components/atoms";
import { IconTile, IconTileGrid, SectionCard } from "@/components/molecules";
import { plural } from "@/lib/labels";
import { ContactActions } from "@/features/shared/ContactActions";
import { useTenants } from "@/features/tenants/hooks";
import { tenantFromLease, type TenantPageState } from "@/features/tenants/origin";
import type { Lease } from "@/types/lease";

/**
 * "Leaseholders" card (lease Details tab, tenant and unit pages): a tile per tenant on the lease (primary first) with
 * Call / Email / Copy (phones from GET /tenants). A tile opens the tenant page with `tenantState` (default: from this lease,
 * so Back returns to it). `currentTenantId` (the tenant page): that tile reads "This tenant" and doesn't link.
 */
export function LeaseholdersCard({ lease, tenantState, currentTenantId }: { lease: Lease; tenantState?: TenantPageState; currentTenantId?: string }) {
  const tenants = useTenants();
  const navigate = useNavigate();
  const open = (tenantId: string) => {
    const link = tenantFromLease(tenantId, lease);
    void navigate(link.to, { state: tenantState ?? link.state });
  };

  return (
    <SectionCard title="Leaseholders" subtitle={plural(lease.tenants.length, "occupant")}>
      {lease.tenants.length === 0 ? (
        <Small>No tenants yet. Add a primary tenant with Edit.</Small>
      ) : (
        <IconTileGrid>
          {lease.tenants.map((t) => {
            const self = t.id === currentTenantId;
            return (
              <IconTile
                key={t.id}
                bareIcon
                icon={<Avatar name={t.fullName} size={40} />}
                label="Tenant"
                value={t.fullName}
                badge={
                  <>
                    <Badge tone={t.isPrimary ? "info" : "neutral"} dot={false}>
                      {t.isPrimary ? "Primary" : "Co-tenant"}
                    </Badge>
                    {self && (
                      <Badge tone="success" dot={false}>
                        This tenant
                      </Badge>
                    )}
                  </>
                }
                action={<ContactActions name={t.fullName} phone={tenants.data?.find((x) => x.id === t.id)?.phone} email={t.email} />}
                onOpen={self ? undefined : () => open(t.id)}
                openLabel={self ? undefined : `Open tenant ${t.fullName}`}
              />
            );
          })}
        </IconTileGrid>
      )}
    </SectionCard>
  );
}
