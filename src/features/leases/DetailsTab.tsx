import { useState, type ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge, Bar, Button, Caption, Dash, H3, Num, Select, Small, Tag } from "@/components/atoms";
import { Card, CardHeader, InlineError, StatusBadge, toast } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, ordinal, toCents } from "@/lib/format";
import { labelOptions, paymentFrequencyLabels, signatureStatusLabels } from "@/lib/labels";
import type { FieldName } from "@/features/leases/form";
import { leaseErrorText, useUpdateLease } from "@/features/leases/hooks";
import { LeaseDocumentCard } from "@/features/leases/LeaseDocumentCard";
import { canEditEndDate } from "@/features/leases/leaseEnd";
import { LeaseEndDateModal } from "@/features/leases/LeaseEndDateModal";
import { PeopleCard } from "@/features/leases/PeopleCard";
import { isClosed, isOldLease } from "@/features/leases/stats";
import { TagEditor } from "@/features/leases/TagEditor";
import { termView } from "@/features/leases/term";
import type { Lease, SignatureStatus } from "@/types/lease";

export interface DetailsTabProps {
  lease: Lease;
  canEdit: boolean;
  /** Opens the lease wizard at the step that has this field. */
  onEdit: (field: FieldName) => void;
}

/**
 * Details tab. Left: Money terms, Term, People and Notes cards (one column on phones). Right: Lease document, E-signature, Tags.
 * The header tiles already show the balance and what was paid, so they aren't repeated here.
 */
export function DetailsTab({ lease, canEdit, onEdit }: DetailsTabProps) {
  const closed = isClosed(lease);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <MoneyTermsCard lease={lease} onEdit={canEdit && !closed ? () => onEdit("rent") : undefined} />
        <TermCard lease={lease} canEdit={canEdit} />
        <PeopleCard lease={lease} />
        <NotesCard notes={lease.notes} onEdit={canEdit ? () => onEdit("notes") : undefined} />
      </div>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
        <Card>
          <LeaseDocumentCard lease={lease} canEdit={canEdit} />
        </Card>
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
 * Rent, Security deposit and Late fee side by side. "Edit terms" only while the terms can still change.
 * An old lease shows only its rent and deposit: its payment frequency and late fee are API defaults, not recorded values.
 */
function MoneyTermsCard({ lease, onEdit }: { lease: Lease; onEdit?: () => void }) {
  const old = isOldLease(lease);
  const frequency = paymentFrequencyLabels[lease.paymentFrequency];
  const hasLateFee = toCents(lease.lateFeeAmount) !== 0;
  return (
    <Card>
      <CardHeader
        title={<H3>Money terms</H3>}
        action={
          onEdit && (
            <HeaderButton icon={pencil} onClick={onEdit}>
              Edit terms
            </HeaderButton>
          )
        }
      />
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MoneyTerm
          label="Rent"
          value={lease.rent === null ? <Dash /> : formatCurrency(lease.rent)}
          note={old ? undefined : lease.rentDueDay === null ? frequency : `${frequency}, due on the ${ordinal(lease.rentDueDay)}`}
        />
        <MoneyTerm label="Security deposit" value={lease.deposit === null ? <Dash /> : formatCurrency(lease.deposit)} />
        {!old && (
          <MoneyTerm
            label="Late fee"
            value={hasLateFee ? formatCurrency(lease.lateFeeAmount) : "None"}
            note={hasLateFee ? `After a ${lease.lateFeeGraceDays}-day grace period` : undefined}
          />
        )}
      </dl>
    </Card>
  );
}

function MoneyTerm({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-text-secondary">{label}</dt>
      <dd className="m-0 flex flex-col">
        <Num className="text-h3 font-bold break-words text-text-primary">{value}</Num>
        {note && <Caption>{note}</Caption>}
      </dd>
    </div>
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
            <Small>Auto-renew: {lease.autoRenew ? "On" : "Off"}</Small>
          </div>
        )}
      </div>
      {editing && <LeaseEndDateModal lease={lease} onClose={() => setEditing(false)} />}
    </Card>
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

/** The notes in a soft box; hidden when there are none and the user can't add any. */
function NotesCard({ notes, onEdit }: { notes: string | null; onEdit?: () => void }) {
  if (!notes && !onEdit) return null;
  return (
    <Card>
      <CardHeader
        title={<H3>Notes</H3>}
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
