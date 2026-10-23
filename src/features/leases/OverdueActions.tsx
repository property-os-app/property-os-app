import { Mail, Phone } from "lucide-react";
import { LinkButton } from "@/components/atoms";
import { useAuth } from "@/features/auth/authContext";
import { coTenants } from "@/features/leases/stats";
import { rentReminderLinks } from "@/features/shared/rentReminder";
import { useTenant } from "@/features/tenants/hooks";
import type { Lease, LeaseTenant } from "@/types/lease";

/**
 * "Call {first name}" (number shown from md) and "Email reminder" in the red lease alert, opening the user's own
 * phone and email apps. The phone comes from the tenant record (the lease has none), so Call shows once it loads.
 * Each button is hidden without a phone / email. Plain `<a>` on purpose: tel: and mailto: leave the app.
 */
export function OverdueActions({ lease, primary, since }: { lease: Lease; primary: LeaseTenant; since: string }) {
  const { me } = useAuth();
  const tenant = useTenant(primary.id);
  const phone = tenant.data?.phone;
  const links = rentReminderLinks({
    tenantName: primary.fullName,
    email: primary.email,
    cc: coTenants(lease).map((t) => t.email).filter(Boolean),
    phone,
    propertyName: lease.unit.property.name,
    unitNumber: lease.unit.unitNumber,
    balance: lease.balance,
    dueDate: since,
    senderName: me?.name ?? "",
  });
  if (!links.tel && !links.mailto) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.tel && (
        <LinkButton href={links.tel} variant="secondary" size="sm" icon={<Phone size={16} strokeWidth={1.5} />}>
          Call {links.firstName}
          <span className="max-md:hidden"> · {phone}</span>
        </LinkButton>
      )}
      {links.mailto && (
        <LinkButton href={links.mailto} variant="secondary" size="sm" icon={<Mail size={16} strokeWidth={1.5} />}>
          Email reminder
        </LinkButton>
      )}
      {/* Later: a "Send reminder" button here, once the backend sends the reminder email itself. */}
    </div>
  );
}
