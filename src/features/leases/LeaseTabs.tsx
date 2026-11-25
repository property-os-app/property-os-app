import { FileX } from "lucide-react";
import { Avatar, Caption } from "@/components/atoms";
import { Card, EmptyState } from "@/components/molecules";
import { ContactLink } from "@/features/shared/ContactLink";
import { useTenants } from "@/features/tenants/hooks";
import type { Lease } from "@/types/lease";

/**
 * Tenants tab: one row per tenant with email and phone (ContactLink: tap to email / call, copy). The lease has no phones,
 * so they come from the cached GET /tenants list and show once it loads (hidden while loading or on error).
 */
export function TenantsTab({ lease }: { lease: Lease }) {
  const tenants = useTenants();
  const phoneOf = (id: string) => tenants.data?.find((t) => t.id === id)?.phone;
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
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={t.fullName} size={32} />
            <div className="min-w-0 flex-1">
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
            <Caption>{t.isPrimary ? "Primary" : "Co-tenant"}</Caption>
          </li>
        ))}
      </ul>
    </Card>
  );
}
