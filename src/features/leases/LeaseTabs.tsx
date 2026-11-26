import { useNavigate } from "react-router";
import { FileX } from "lucide-react";
import { Avatar, Caption } from "@/components/atoms";
import { Card, EmptyState } from "@/components/molecules";
import { ContactLink } from "@/features/shared/ContactLink";
import { useTenants } from "@/features/tenants/hooks";
import { tenantFromLease } from "@/features/tenants/origin";
import type { Lease } from "@/types/lease";

/**
 * Tenants tab: one row per tenant with email and phone (ContactLink: tap to email / call, copy). A row opens the tenant
 * page (Back returns to this lease); the contact links sit on top and keep working. The lease has no phones,
 * so they come from the cached GET /tenants list and show once it loads (hidden while loading or on error).
 */
export function TenantsTab({ lease }: { lease: Lease }) {
  const tenants = useTenants();
  const phoneOf = (id: string) => tenants.data?.find((t) => t.id === id)?.phone;
  const navigate = useNavigate();
  if (lease.tenants.length === 0) {
    return (
      <Card padding="none">
        <EmptyState icon={<FileX strokeWidth={1.5} />} title="No tenants yet" description="Add a primary tenant with Edit." />
      </Card>
    );
  }
  return (
    <Card padding="none" className="overflow-hidden">
      <ul className="m-0 list-none divide-y divide-border-subtle p-0">
        {lease.tenants.map((t) => (
          <li key={t.id} className="relative flex items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-3">
            <button
              type="button"
              aria-label={`Open tenant ${t.fullName}`}
              onClick={() => {
                const { to, state } = tenantFromLease(t.id, lease);
                void navigate(to, { state });
              }}
              className="absolute inset-0 cursor-pointer focus-visible:focus-ring-tight focus-visible:[outline-offset:-2px]"
            />
            <Avatar name={t.fullName} size={32} className="pointer-events-none relative" />
            <div className="pointer-events-none relative min-w-0 flex-1">
              <div className="truncate font-semibold text-text-primary">{t.fullName}</div>
              {t.email && (
                <Caption className="block truncate">
                  <ContactLink kind="email" value={t.email} />
                </Caption>
              )}
              {phoneOf(t.id) && (
                <Caption className="block truncate">
                  <ContactLink kind="phone" value={phoneOf(t.id)} />
                </Caption>
              )}
            </div>
            <Caption className="pointer-events-none relative">{t.isPrimary ? "Primary" : "Co-tenant"}</Caption>
          </li>
        ))}
      </ul>
    </Card>
  );
}
