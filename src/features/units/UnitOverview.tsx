import { useNavigate } from "react-router";
import { Bath, CalendarCheck, CalendarClock, DoorOpen, FileText, Layers, Pencil, Plus, Ruler, Scale, Tag } from "lucide-react";
import { Avatar, Badge, Button, Num } from "@/components/atoms";
import { Card, EmptyState, IconTile, IconTileGrid, SectionCard, StatusBadge } from "@/components/molecules";
import { formatCurrency, formatDate } from "@/lib/format";
import { unitStatusLabels, unitTypeLabels } from "@/lib/labels";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { balanceTone, balanceToneClass, balanceValueText, dueNote, dueState, leaseEndsNote, leasePeriod } from "@/features/leases/stats";
import { ContactActions } from "@/features/shared/ContactActions";
import { NotSet } from "@/features/shared/Missing";
import { useTenants } from "@/features/tenants/hooks";
import type { TenantPageState } from "@/features/tenants/origin";
import { floorAreaText, rentDiffNote } from "@/features/units/stats";
import type { Lease } from "@/types/lease";
import type { Unit } from "@/types/unit";

/**
 * The unit's ACTIVE lease: lease number and period, "Open lease" (with `leaseState`), then tiles for the primary tenant
 * (payment badge, Call / Email / Copy with the phone from GET /tenants; opens the tenant page with `tenantState`),
 * Current rent, Balance ("Credit $X" from the ledger's summary.credit, `credit`) and Lease ends.
 */
export function UnitCurrentLease({
  lease,
  unit,
  leaseState,
  tenantState,
  credit,
}: {
  lease: Lease;
  unit: Unit;
  leaseState: LeasePageState;
  tenantState: TenantPageState;
  credit: string | null;
}) {
  const navigate = useNavigate();
  const tenants = useTenants();
  const tenant = lease.tenants.find((t) => t.isPrimary) ?? lease.tenants[0];
  const due = dueState(lease);
  const period = leasePeriod(lease);

  return (
    <SectionCard
      title="Current lease"
      subtitle={[`Lease ${lease.leaseNumber}`, period].filter(Boolean).join(" · ")}
      action={
        <Button size="sm" onClick={() => void navigate(`/leases/${encodeURIComponent(lease.id)}`, { state: leaseState })} className="max-md:h-11">
          Open lease
        </Button>
      }
    >
      <IconTileGrid>
        <IconTile
          bareIcon
          icon={<Avatar name={tenant?.fullName ?? "-"} size={40} />}
          label="Primary tenant"
          value={tenant?.fullName ?? <NotSet />}
          badge={
            due.kind === "overdue" ? (
              <StatusBadge domain="rent" status="OVERDUE" />
            ) : due.kind === "today" ? (
              <Badge tone="warning">Due today</Badge>
            ) : (
              <LeaseBadge lease={lease} />
            )
          }
          action={tenant && <ContactActions name={tenant.fullName} phone={tenants.data?.find((x) => x.id === tenant.id)?.phone} email={tenant.email} />}
          onOpen={tenant ? () => void navigate(`/tenants/${encodeURIComponent(tenant.id)}`, { state: tenantState }) : undefined}
          openLabel={tenant ? `Open tenant ${tenant.fullName}` : undefined}
        />
        <IconTile icon={<CalendarClock strokeWidth={1.5} />} label="Current rent" value={<Num>{formatCurrency(lease.rent)}</Num>} note={rentDiffNote(lease.rent, unit.monthlyRent)} />
        <IconTile
          icon={<Scale strokeWidth={1.5} />}
          label="Balance"
          value={<Num>{balanceValueText(lease.balance, credit)}</Num>}
          valueClassName={balanceToneClass[balanceTone(due, credit)]}
          note={credit ? "Paid ahead" : dueNote(due)}
        />
        <IconTile icon={<CalendarCheck strokeWidth={1.5} />} label="Lease ends" value={formatDate(lease.endDate)} note={leaseEndsNote(lease)} />
      </IconTileGrid>
    </SectionCard>
  );
}

/** No ACTIVE lease: "No active lease", "This unit is vacant." and "Add lease" with `onAddLease`. */
export function UnitNoLease({ unit, onAddLease }: { unit: Unit; onAddLease?: () => void }) {
  return (
    <Card padding="none">
      <EmptyState
        icon={<FileText strokeWidth={1.5} />}
        title="No active lease"
        description={`This unit is ${unitStatusLabels[unit.status].toLowerCase()}.`}
        action={
          onAddLease ? (
            <Button icon={<Plus size={16} strokeWidth={1.5} />} onClick={onAddLease}>
              Add lease
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}

/** "Unit" / "Layout and listing": Type, Bathrooms, Floor, Floor area, Listed rent ("Not set" for nulls, $0.00 for a rent of 0). "Edit unit" with `onEdit`. */
export function UnitInfoCard({ unit, onEdit }: { unit: Unit; onEdit?: () => void }) {
  return (
    <SectionCard
      title="Unit"
      subtitle="Layout and listing"
      action={
        onEdit && (
          <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={onEdit} className="max-md:h-11">
            Edit unit
          </Button>
        )
      }
    >
      <IconTileGrid>
        <IconTile icon={<DoorOpen strokeWidth={1.5} />} label="Type" value={unitTypeLabels[unit.unitType]} />
        <IconTile icon={<Bath strokeWidth={1.5} />} label="Bathrooms" value={unit.bathrooms ?? <NotSet />} />
        <IconTile icon={<Layers strokeWidth={1.5} />} label="Floor" value={unit.floor ?? <NotSet />} />
        <IconTile icon={<Ruler strokeWidth={1.5} />} label="Floor area" value={unit.floorArea === null ? <NotSet /> : <Num>{floorAreaText(unit.floorArea)}</Num>} />
        <IconTile icon={<Tag strokeWidth={1.5} />} label="Listed rent" value={unit.monthlyRent === null ? <NotSet /> : <Num>{formatCurrency(unit.monthlyRent)}</Num>} />
      </IconTileGrid>
    </SectionCard>
  );
}

/** The description in a soft box; nothing when there is none. */
export function UnitDescriptionCard({ description }: { description: string | null }) {
  if (!description?.trim()) return null;
  return (
    <SectionCard title="Description">
      <div className="rounded-control bg-surface-2 p-4 break-words whitespace-pre-line text-text-primary">{description}</div>
    </SectionCard>
  );
}
