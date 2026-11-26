import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlarmClock, CalendarClock, Pencil, Plus, Scale, ShieldCheck } from "lucide-react";
import { Badge, Bar, Button, Dash, H3, Num, Select, Small, Tag, Toggle } from "@/components/atoms";
import { Card, CardHeader, IconTile, IconTileGrid, InlineError, SectionCard, StatusBadge, toast } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, ordinal, toCents } from "@/lib/format";
import { labelOptions, paymentFrequencyLabels, signatureStatusLabels } from "@/lib/labels";
import { balanceText } from "@/features/ledger/balance";
import { creditAmount } from "@/features/ledger/cards";
import { useLedger } from "@/features/ledger/hooks";
import type { FieldName } from "@/features/leases/form";
import { leaseErrorText, useUpdateLease } from "@/features/leases/hooks";
import { leaseKeys } from "@/features/leases/keys";
import { LeaseCard } from "@/features/leases/LeaseCard";
import { LeaseholdersCard } from "@/features/leases/LeaseholdersCard";
import { canEditEndDate } from "@/features/leases/leaseEnd";
import { LeaseEndDateModal } from "@/features/leases/LeaseEndDateModal";
import { autoRenewEditable, dueNote, dueState, isClosed, isOldLease } from "@/features/leases/stats";
import { NotSet } from "@/features/shared/Missing";
import { TagEditor } from "@/features/leases/TagEditor";
import { termView } from "@/features/leases/term";
import type { Lease, SignatureStatus } from "@/types/lease";

export interface DetailsTabProps {
  lease: Lease;
  canEdit: boolean;
  /** Opens the lease wizard at the step that has this field. */
  onEdit: (field: FieldName) => void;
  /** Switches to the Documents tab ("+N more" signed copies). */
  onOpenDocuments: () => void;
}

/**
 * Details tab. Left: Financials, Lease (number, template, PDF, signed copy), Term, Leaseholders and Internal lease notes
 * (one column on phones). Right: E-signature and Tags.
 */
export function DetailsTab({ lease, canEdit, onEdit, onOpenDocuments }: DetailsTabProps) {
  const closed = isClosed(lease);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <FinancialsCard lease={lease} onEdit={canEdit && !closed ? () => onEdit("rent") : undefined} />
        <LeaseCard lease={lease} canEdit={canEdit} onOpenDocuments={onOpenDocuments} />
        <TermCard lease={lease} canEdit={canEdit} />
        <LeaseholdersCard lease={lease} />
        <NotesCard notes={lease.notes} onEdit={canEdit ? () => onEdit("notes") : undefined} />
      </div>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
        <Card>
          <SignatureSection lease={lease} canChange={canEdit && !closed} />
        </Card>
        <Card>
          <TagsSection lease={lease} canEdit={canEdit} />
        </Card>
      </div>
    </div>
  );
}

/** A card header's small button, 44px tall on phones. */
function HeaderButton({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: string }) {
  return (
    <Button size="sm" icon={icon} onClick={onClick} className="shrink-0 max-md:h-11">
      {children}
    </Button>
  );
}

const pencil = <Pencil size={14} strokeWidth={1.5} />;

/**
 * Rent (payment frequency badge, due day), Balance, Security deposit and Late fee tiles. "Edit terms" only while the terms
 * can still change. An old lease shows only its rent and deposit: its frequency and late fee are API defaults, not recorded values.
 */
function FinancialsCard({ lease, onEdit }: { lease: Lease; onEdit?: () => void }) {
  const old = isOldLease(lease);
  const hasLateFee = toCents(lease.lateFeeAmount) !== 0;
  return (
    <SectionCard
      title="Financials"
      subtitle={old ? "Rent and deposit, as recorded" : "Rent, balance, deposit and fees"}
      action={
        onEdit && (
          <HeaderButton icon={pencil} onClick={onEdit}>
            Edit terms
          </HeaderButton>
        )
      }
    >
      <IconTileGrid>
        <IconTile
          icon={<CalendarClock strokeWidth={1.5} />}
          label="Rent"
          value={lease.rent === null ? <NotSet /> : <Num>{formatCurrency(lease.rent)}</Num>}
          badge={
            old ? undefined : (
              <Badge tone="neutral" dot={false}>
                {paymentFrequencyLabels[lease.paymentFrequency]}
              </Badge>
            )
          }
          note={!old && lease.rentDueDay !== null ? `Due on the ${ordinal(lease.rentDueDay)}` : undefined}
        />
        {!old && <BalanceTile lease={lease} />}
        <IconTile
          icon={<ShieldCheck strokeWidth={1.5} />}
          label="Security deposit"
          value={lease.deposit === null ? <NotSet /> : <Num>{formatCurrency(lease.deposit)}</Num>}
        />
        {!old && (
          <IconTile
            icon={<AlarmClock strokeWidth={1.5} />}
            label="Late fee"
            value={hasLateFee ? <Num>{formatCurrency(lease.lateFeeAmount)}</Num> : "None"}
            note={hasLateFee ? `After a ${lease.lateFeeGraceDays}-day grace period` : undefined}
          />
        )}
      </IconTileGrid>
    </SectionCard>
  );
}

/** The lease's balance with our due wording (`dueState`): "Clear" at $0, red with the Overdue badge when overdue; "Credit $…" from the ledger's `summary.credit`. */
function BalanceTile({ lease }: { lease: Lease }) {
  // The lease page has already loaded the ledger (same query): the credit comes from summary.credit.
  const ledger = useLedger(lease.id, { enabled: lease.status !== "DRAFT" });
  const credit = creditAmount(ledger.data?.summary);
  const icon = <Scale strokeWidth={1.5} />;
  if (credit) return <IconTile icon={icon} label="Balance" value={<Num>Credit {formatCurrency(credit)}</Num>} valueClassName="text-success" note="Paid ahead" />;
  if (lease.status === "DRAFT") return <IconTile icon={icon} label="Balance" value={<Num>{formatCurrency(lease.balance)}</Num>} note="No ledger on a draft" />;
  const due = dueState(lease);
  const badge =
    due.kind === "none" ? (
      <Badge tone="success" dot={false}>
        Clear
      </Badge>
    ) : due.kind === "overdue" ? (
      <StatusBadge domain="rent" status="OVERDUE" />
    ) : due.kind === "today" ? (
      <Badge tone="warning">Due today</Badge>
    ) : undefined;
  return (
    <IconTile
      icon={icon}
      label="Balance"
      value={<Num>{balanceText(lease.balance)}</Num>}
      valueClassName={due.kind === "overdue" ? "text-danger" : undefined}
      badge={badge}
      note={due.kind === "overdue" || due.kind === "future" ? dueNote(due) : undefined}
    />
  );
}

/** Start and end dates (the day it ended, once it has) with the progress bar between them (`termView`); an old lease shows only its dates. "Edit end date" on a lease that ended. */
function TermCard({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const view = termView(lease);
  const [editing, setEditing] = useState(false);
  const showEdit = canEdit && canEditEndDate(lease);
  return (
    <Card>
      <CardHeader
        title={<H3>Term</H3>}
        action={
          (view.badge || showEdit) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {view.badge && (
                <Badge tone="neutral" dot={false}>
                  {view.badge}
                </Badge>
              )}
              {showEdit && (
                <HeaderButton icon={pencil} onClick={() => setEditing(true)}>
                  Edit end date
                </HeaderButton>
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

/** "Internal lease notes" in a soft box; hidden when there are none and the user can't add any. */
function NotesCard({ notes, onEdit }: { notes: string | null; onEdit?: () => void }) {
  if (!notes && !onEdit) return null;
  return (
    <Card>
      <CardHeader
        title={<H3>Internal lease notes</H3>}
        action={
          onEdit && (
            <HeaderButton icon={notes ? pencil : <Plus size={14} strokeWidth={1.5} />} onClick={onEdit}>
              {notes ? "Edit" : "Add notes"}
            </HeaderButton>
          )
        }
      />
      {notes ? <div className="rounded-control bg-surface-2 p-4 break-words whitespace-pre-line text-text-primary">{notes}</div> : <Small>No notes yet.</Small>}
    </Card>
  );
}

/** E-signature badge, plus a small Select (PATCH signatureStatus only) for users who can edit. */
function SignatureSection({ lease, canChange }: { lease: Lease; canChange: boolean }) {
  const update = useUpdateLease();
  const [error, setError] = useState<string | null>(null);

  const change = async (signatureStatus: SignatureStatus) => {
    setError(null);
    try {
      await update.mutateAsync({ id: lease.id, body: { signatureStatus } });
      toast.success("Signature status updated");
    } catch (err) {
      setError(leaseErrorText(err));
    }
  };

  const shown = update.isPending ? (update.variables?.body.signatureStatus ?? lease.signatureStatus) : lease.signatureStatus;

  return (
    <div className="flex flex-col gap-3">
      <H3>E-signature</H3>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge domain="esign" status={shown} />
        {canChange && (
          <div className="w-44">
            <Select aria-label="Change e-signature status" value={shown} disabled={update.isPending} onChange={(e) => void change(e.target.value as SignatureStatus)}>
              {labelOptions(signatureStatusLabels).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {error && <InlineError title="Couldn't update the signature status" description={error} />}
    </div>
  );
}

/** Tag chips; with edit rights, remove (x) and "+ Add tag" save the whole list with PATCH tags (any status). */
function TagsSection({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const update = useUpdateLease();
  const [error, setError] = useState<string | null>(null);
  const tags = update.isPending ? (update.variables?.body.tags ?? lease.tags) : lease.tags;

  const save = async (next: string[]) => {
    setError(null);
    try {
      await update.mutateAsync({ id: lease.id, body: { tags: next } });
      toast.success("Tags updated");
    } catch (err) {
      setError(leaseErrorText(err));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <H3>Tags</H3>
      {canEdit ? (
        <TagEditor idPrefix="lp-tags" value={tags} onChange={(next) => void save(next)} disabled={update.isPending} />
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      ) : (
        <Dash />
      )}
      {error && <InlineError title="Couldn't save the tags" description={error} />}
    </div>
  );
}
