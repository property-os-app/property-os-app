import { useState, type ReactNode } from "react";
import { AlarmClock, PawPrint, Pencil, Plus, ShieldCheck, Wallet } from "lucide-react";
import { Button, Dash, H3, Num, Select, Small, Tag } from "@/components/atoms";
import { Card, CardHeader, IconTile, IconTileGrid, InlineError, SectionCard, StatusBadge, toast } from "@/components/molecules";
import { formatCurrency, toCents } from "@/lib/format";
import { labelOptions, signatureStatusLabels } from "@/lib/labels";
import { DepositCard } from "@/features/deposits/DepositCard";
import { depositBadge, leaseDepositTotal } from "@/features/deposits/endPreview";
import type { FieldName } from "@/features/leases/form";
import { leaseErrorText, useUpdateLease } from "@/features/leases/hooks";
import { LeaseCard } from "@/features/leases/LeaseCard";
import { LeaseholdersCard } from "@/features/leases/LeaseholdersCard";
import { isClosed, isOldLease } from "@/features/leases/stats";
import { NotSet } from "@/features/shared/Missing";
import { TagEditor } from "@/features/leases/TagEditor";
import { TermCard } from "@/features/leases/TermCard";
import type { Lease, SignatureStatus } from "@/types/lease";

export interface DetailsTabProps {
  lease: Lease;
  canEdit: boolean;
  /** Opens the lease wizard at the step that has this field. */
  onEdit: (field: FieldName) => void;
  /** Switches to the Documents tab ("+N more" signed copies, refund proof). */
  onOpenDocuments: () => void;
  /** Settle or edit the deposit (money.record). */
  canSettle: boolean;
  /** Void the rent after the end date (money.void). */
  canVoid: boolean;
  /** Shows a payment in the ledger's All entries (the deposit's DEPOSIT payment). */
  onShowPayment: (paymentId: string) => void;
  /** Scroll to the Deposit card (the ledger's "From deposit settlement" link). */
  focusDeposit?: boolean;
}

/**
 * Details tab. Left: Term, Financials, Deposit (ENDED / TERMINATED leases with a deposit), Lease (number, template, PDF, signed copy),
 * Leaseholders and Internal lease notes (one column on phones). Right: E-signature and Tags.
 */
export function DetailsTab({ lease, canEdit, onEdit, onOpenDocuments, canSettle, canVoid, onShowPayment, focusDeposit }: DetailsTabProps) {
  const closed = isClosed(lease);
  const hasDeposit = toCents(leaseDepositTotal(lease)) > 0;
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <TermCard lease={lease} canEdit={canEdit} canVoid={canVoid} />
        <FinancialsCard lease={lease} onEdit={canEdit && !closed ? () => onEdit("rent") : undefined} />
        {closed && hasDeposit && (
          <DepositCard lease={lease} canSettle={canSettle} canUpload={canEdit} onOpenDocuments={onOpenDocuments} onShowPayment={onShowPayment} focus={focusDeposit} />
        )}
        <LeaseCard lease={lease} canEdit={canEdit} onOpenDocuments={onOpenDocuments} />
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
 * "Deposits and fees": Deposits (security + pet total with the deposit status badge), Security deposit, Pet deposit ("None"
 * without one) and Late fee (with its grace period). Rent and balance are in the header tiles. "Edit terms" only while the
 * terms can still change. An old lease shows only its deposits: its late fee is an API default, not a recorded value.
 */
function FinancialsCard({ lease, onEdit }: { lease: Lease; onEdit?: () => void }) {
  const old = isOldLease(lease);
  const hasLateFee = toCents(lease.lateFeeAmount) !== 0;
  const total = leaseDepositTotal(lease);
  const badge = depositBadge(lease.depositStatus, total, lease.status);
  const noDeposits = lease.deposit === null && lease.petDeposit === null;
  const hasPet = toCents(lease.petDeposit) > 0;
  return (
    <SectionCard
      title="Financials"
      subtitle={old ? "Deposits, as recorded" : "Deposits and fees"}
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
          icon={<ShieldCheck strokeWidth={1.5} />}
          label="Deposits"
          value={noDeposits ? <NotSet /> : <Num>{formatCurrency(total)}</Num>}
          badge={badge ? <StatusBadge domain="deposit" status={badge} /> : undefined}
          note={noDeposits ? undefined : "Security + pet, held together"}
        />
        <IconTile icon={<Wallet strokeWidth={1.5} />} label="Security deposit" value={lease.deposit === null ? <NotSet /> : <Num>{formatCurrency(lease.deposit)}</Num>} />
        <IconTile icon={<PawPrint strokeWidth={1.5} />} label="Pet deposit" value={hasPet ? <Num>{formatCurrency(lease.petDeposit)}</Num> : "None"} />
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
