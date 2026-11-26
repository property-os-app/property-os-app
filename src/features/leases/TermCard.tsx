import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, Pencil } from "lucide-react";
import { Badge, Bar, Button, Dash, H3, Small, Toggle } from "@/components/atoms";
import { Card, CardHeader, toast } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { VoidAfterEndModal } from "@/features/deposits/VoidAfterEndModal";
import { leaseErrorText, useUpdateLease } from "@/features/leases/hooks";
import { leaseKeys } from "@/features/leases/keys";
import { canEditEndDate, canVoidAfterEnd } from "@/features/leases/leaseEnd";
import { LeaseEndDateModal } from "@/features/leases/LeaseEndDateModal";
import { autoRenewEditable, isOldLease } from "@/features/leases/stats";
import { termView } from "@/features/leases/term";
import type { Lease } from "@/types/lease";

/**
 * Start and end dates (the day it ended, once it has) with the progress bar between them (`termView`); an old lease shows only
 * its dates. "Edit end date" (`canEdit`) on a lease that ended; "Void rent after end date" (`canVoid`, money.void) on one ended
 * or cancelled in the app; Auto-renew is a switch with `canEdit`. With both off it is read-only (tenant and unit pages):
 * Auto-renew as an On / Off badge, no buttons.
 */
export function TermCard({ lease, canEdit, canVoid }: { lease: Lease; canEdit: boolean; canVoid: boolean }) {
  const view = termView(lease);
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const showEdit = canEdit && canEditEndDate(lease);
  const showVoid = canVoid && canVoidAfterEnd(lease);
  return (
    <Card>
      <CardHeader
        title={<H3>Term</H3>}
        action={
          (view.badge || showEdit || showVoid) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {view.badge && (
                <Badge tone="neutral" dot={false}>
                  {view.badge}
                </Badge>
              )}
              {showEdit && (
                <Button size="sm" icon={<Pencil size={14} strokeWidth={1.5} />} onClick={() => setEditing(true)} className="shrink-0 max-md:h-11">
                  Edit end date
                </Button>
              )}
              {showVoid && (
                <Button size="sm" icon={<Ban size={14} strokeWidth={1.5} />} onClick={() => setVoiding(true)} className="shrink-0 max-md:h-11">
                  Void rent after end date
                </Button>
              )}
            </div>
          )
        }
      />
      <div className="flex flex-col gap-3">
        <dl className="m-0 flex items-end justify-between gap-4">
          <TermDate label="Start" date={lease.startDate} />
          <TermDate label="End" date={lease.endedOn ?? lease.endDate} right />
        </dl>
        {view.percent !== null && <Bar value={view.percent} tone={view.tone} label="Lease term" valueText={view.text ?? undefined} className="h-1.5" />}
        {!isOldLease(lease) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {view.text && (
              <div className="flex min-w-0 flex-col">
                <Small className={cn(view.tone === "warning" && "font-semibold text-warning")}>{view.text}</Small>
                {view.note && <Small>{view.note}</Small>}
              </div>
            )}
            <AutoRenew lease={lease} canEdit={canEdit} />
          </div>
        )}
      </div>
      {editing && <LeaseEndDateModal lease={lease} onClose={() => setEditing(false)} />}
      {voiding && <VoidAfterEndModal lease={lease} onClose={() => setVoiding(false)} />}
    </Card>
  );
}

/**
 * Auto-renew: a switch that saves at once (PATCH { autoRenew }) with lease.edit on a DRAFT or ACTIVE lease, else an On / Off
 * badge. The switch shows the new value while saving (disabled), keeps it from the PATCH answer, and falls back with a
 * toast on an error.
 */
function AutoRenew({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const update = useUpdateLease();
  const qc = useQueryClient();
  const id = `auto-renew-${lease.id}`;

  if (!canEdit || !autoRenewEditable(lease)) {
    return (
      <span className="flex items-center gap-2">
        <Small>Auto-renew</Small>
        <Badge tone={lease.autoRenew ? "success" : "neutral"} dot={false}>
          {lease.autoRenew ? "On" : "Off"}
        </Badge>
      </span>
    );
  }

  const shown = update.isPending ? (update.variables?.body.autoRenew ?? lease.autoRenew) : lease.autoRenew;
  const change = (autoRenew: boolean) =>
    update.mutate(
      { id: lease.id, body: { autoRenew } },
      {
        onSuccess: (saved) => {
          qc.setQueryData(leaseKeys.detail(lease.id), saved);
          toast.success(saved.autoRenew ? "Auto-renew on" : "Auto-renew off");
        },
        onError: (err) => toast.error("Couldn't change auto-renew", { description: leaseErrorText(err) }),
      },
    );
  return (
    <span className="flex items-center gap-3">
      <label htmlFor={id} className="text-small text-text-secondary">
        Auto-renew
      </label>
      <Toggle id={id} checked={shown} disabled={update.isPending} aria-busy={update.isPending || undefined} onChange={change} />
      <Small aria-hidden>{shown ? "On" : "Off"}</Small>
    </span>
  );
}

function TermDate({ label, date, right }: { label: string; date: string | null; right?: boolean }) {
  return (
    <div className={cn("min-w-0", right && "text-right")}>
      <dt className="text-small text-text-secondary">{label}</dt>
      <dd className="m-0 font-bold text-text-primary">{date ? formatDate(date) : <Dash />}</dd>
    </div>
  );
}
