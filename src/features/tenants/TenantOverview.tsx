import { useNavigate } from "react-router";
import { CalendarCheck, CalendarClock, CalendarDays, IdCard, Mail, MapPin, MessageSquare, Pencil, Phone, Scale, User, Users } from "lucide-react";
import { Button, Caption, Num } from "@/components/atoms";
import { IconTile, IconTileGrid, SectionCard } from "@/components/molecules";
import { formatCurrency, formatDate, formatTimestampDate, parseDateOnly } from "@/lib/format";
import { paymentFrequencyLabels, tenantTypeLabels } from "@/lib/labels";
import { roleLabel } from "@/features/auth/permissions";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { ContactActions } from "@/features/shared/ContactActions";
import { NotProvided } from "@/features/shared/Missing";
import { preferredContactText, unitLine } from "@/features/tenants/stats";
import type { Lease } from "@/types/lease";
import type { TenantDetail } from "@/types/tenant";

const orNotProvided = (value: string | null | undefined) => (value?.trim() ? value : <NotProvided />);

/** The tenant's ACTIVE lease: unit, lease number and period, badge, "Open lease" (with `leaseState`), Rent / Balance / Lease ends tiles. */
export function TenantCurrentLease({ lease, leaseState }: { lease: Lease; leaseState: LeasePageState }) {
  const navigate = useNavigate();
  const due = dueState(lease);
  return (
    <SectionCard
      title="Current lease"
      subtitle={[unitLine(lease), `Lease ${lease.leaseNumber}`, leasePeriod(lease)].filter(Boolean).join(" · ")}
      action={
        <>
          <LeaseBadge lease={lease} />
          <Button size="sm" onClick={() => void navigate(`/leases/${encodeURIComponent(lease.id)}`, { state: leaseState })} className="max-md:h-11">
            Open lease
          </Button>
        </>
      }
    >
      <IconTileGrid>
        <IconTile icon={<CalendarClock strokeWidth={1.5} />} label="Rent" value={<Num>{formatCurrency(lease.rent)}</Num>} note={paymentFrequencyLabels[lease.paymentFrequency]} />
        <IconTile
          icon={<Scale strokeWidth={1.5} />}
          label="Balance"
          value={<Num>{formatCurrency(lease.balance)}</Num>}
          valueClassName={due.kind === "overdue" ? "text-danger" : undefined}
          note={dueNote(due)}
        />
        <IconTile icon={<CalendarCheck strokeWidth={1.5} />} label="Lease ends" value={formatDate(lease.endDate)} note={leaseEndsNote(lease)} />
      </IconTileGrid>
    </SectionCard>
  );
}

/** Contact: Email and Phone (ContactActions; "Not provided" when missing), Preferred contact, Address. "Edit tenant" with `onEdit`. */
export function TenantContactCard({ tenant, onEdit }: { tenant: TenantDetail; onEdit?: () => void }) {
  const email = tenant.email?.trim() ? tenant.email : null;
  const phone = tenant.phone?.trim() ? tenant.phone : null;
  return (
    <SectionCard
      title="Contact"
      subtitle="How to reach them"
      action={
        onEdit && (
          <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={onEdit} className="max-md:h-11">
            Edit tenant
          </Button>
        )
      }
    >
      <IconTileGrid>
        <IconTile
          icon={<Mail strokeWidth={1.5} />}
          label="Email"
          value={email ?? <NotProvided />}
          action={email ? <ContactActions name={tenant.fullName} phone={null} email={email} /> : undefined}
        />
        <IconTile
          icon={<Phone strokeWidth={1.5} />}
          label="Phone"
          value={phone ?? <NotProvided />}
          action={phone ? <ContactActions name={tenant.fullName} phone={phone} email={null} /> : undefined}
        />
        <IconTile icon={<MessageSquare strokeWidth={1.5} />} label="Preferred contact" value={preferredContactText(tenant)} />
        <IconTile icon={<MapPin strokeWidth={1.5} />} label="Address" value={orNotProvided(tenant.address)} />
      </IconTileGrid>
    </SectionCard>
  );
}

/** Personal: Full name, Tenant type, ID / passport number (shown only here), Move-in date. */
export function TenantPersonalCard({ tenant }: { tenant: TenantDetail }) {
  return (
    <SectionCard title="Personal" subtitle="Identity and move-in">
      <IconTileGrid>
        <IconTile icon={<User strokeWidth={1.5} />} label="Full name" value={tenant.fullName} />
        <IconTile icon={<Users strokeWidth={1.5} />} label="Tenant type" value={tenantTypeLabels[tenant.tenantType]} />
        <IconTile icon={<IdCard strokeWidth={1.5} />} label="ID / passport number" value={orNotProvided(tenant.idNumber)} />
        <IconTile
          icon={<CalendarDays strokeWidth={1.5} />}
          label="Move-in date"
          value={parseDateOnly(tenant.moveInDate) ? formatDate(tenant.moveInDate) : <NotProvided />}
        />
      </IconTileGrid>
    </SectionCard>
  );
}

/** Notes in a soft box; nothing when there are none. */
export function TenantNotesCard({ notes }: { notes: string | null }) {
  if (!notes?.trim()) return null;
  return (
    <SectionCard title="Notes">
      <div className="rounded-control bg-surface-2 p-4 break-words whitespace-pre-line text-text-primary">{notes}</div>
    </SectionCard>
  );
}

/** Muted "Added by {email} ({role}) on {date}"; a long email wraps instead of widening the page on phones. */
export function AddedByLine({ tenant }: { tenant: TenantDetail }) {
  return (
    <Caption className="block wrap-anywhere">
      Added by {tenant.createdBy.email} ({roleLabel(tenant.createdBy.role)}) on {formatTimestampDate(tenant.createdAt)}
    </Caption>
  );
}
