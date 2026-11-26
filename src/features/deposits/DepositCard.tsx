import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Upload } from "lucide-react";
import { Button, Caption, Num, Skeleton, Small } from "@/components/atoms";
import { InlineError, SectionCard, StatusBadge } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, toCents } from "@/lib/format";
import { paymentMethodLabel, plural } from "@/lib/labels";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { depositBadge } from "@/features/deposits/endPreview";
import { useDeposit } from "@/features/deposits/hooks";
import { depositKeys } from "@/features/deposits/keys";
import { SettlementModal } from "@/features/deposits/SettlementModal";
import { textLink } from "@/features/shared/linkClass";
import type { DepositResponse } from "@/types/deposit";
import type { Lease } from "@/types/lease";

/** The element id the ledger's "From deposit settlement" link scrolls to. */
export const DEPOSIT_CARD_ID = "lease-deposit";

export interface DepositCardProps {
  lease: Lease;
  /** Settle / edit (money.record). */
  canSettle: boolean;
  /** Upload refund proof (lease documents: leases.manage). */
  canUpload: boolean;
  /** Opens the Documents tab (refund proof count). */
  onOpenDocuments: () => void;
  /** Shows the DEPOSIT payment in the ledger's All entries. */
  onShowPayment: (paymentId: string) => void;
  /** Scroll to the card and highlight it once (the ledger's "From deposit settlement" link). */
  focus?: boolean;
}

/**
 * Details tab, ENDED / TERMINATED leases with a deposit (GET /leases/:id/deposit): status, total held and the saved settlement
 * (deductions, applied to balance with its payment, refund, notes, refund proof count). "Settle deposit" / "Edit settlement"
 * (money.record); "Not tracked" leases get "Record settlement"; appliedExceedsBalance shows a warning with "Re-save settlement".
 * "Upload refund proof" uploads a lease document with category Security deposit.
 */
export function DepositCard({ lease, canSettle, canUpload, onOpenDocuments, onShowPayment, focus }: DepositCardProps) {
  const deposit = useDeposit(lease.id);
  const qc = useQueryClient();
  const [settling, setSettling] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ready = deposit.isSuccess;

  // Highlighted while `focus` is on (the lease page turns it off on the next tab change).
  useEffect(() => {
    if (focus && ready) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, ready]);

  const d = deposit.data;
  const badge = d ? depositBadge(d.status, d.totalHeld, d.leaseStatus) : null;
  const action = d && canSettle ? settleAction(d) : null;

  return (
    <div ref={ref} id={DEPOSIT_CARD_ID} className={cn("scroll-mt-24 rounded-card transition-shadow", focus && "ring-2 ring-info")}>
      <SectionCard
        title="Deposit"
        subtitle={d ? subtitle(d) : "Security and pet deposit"}
        action={
          d && (
            <>
              {canUpload && (
                <Button size="sm" icon={<Upload size={14} strokeWidth={1.5} />} onClick={() => setUploading(true)} className="max-md:h-11">
                  Upload refund proof
                </Button>
              )}
              {action && (
                <Button size="sm" icon={d.settlement ? <Pencil size={14} strokeWidth={1.5} /> : undefined} onClick={() => setSettling(action)} className="max-md:h-11">
                  {action}
                </Button>
              )}
            </>
          )
        }
      >
        {deposit.isPending ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-16" />
          </div>
        ) : deposit.isError ? (
          <InlineError title="Couldn't load the deposit" description={errorText(deposit.error)} onRetry={() => void deposit.refetch()} />
        ) : d ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {badge && <StatusBadge domain="deposit" status={badge} />}
              <Small>
                Total held <Num className="font-bold text-text-primary">{formatCurrency(d.totalHeld)}</Num>
              </Small>
            </div>

            {d.appliedExceedsBalance && (
              <div className="flex flex-col gap-2 rounded-control border border-warning/30 bg-warning-soft p-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2 text-small text-text-primary">
                  <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                  The balance dropped below the amount applied from the deposit, so the extra sits as a credit. Re-save the settlement to correct it.
                </span>
                {canSettle && (
                  <Button size="sm" onClick={() => setSettling("Re-save settlement")} className="shrink-0 max-md:h-11">
                    Re-save settlement
                  </Button>
                )}
              </div>
            )}

            {d.settlement ? (
              <SettlementDetails deposit={d} onShowPayment={onShowPayment} />
            ) : d.tracked ? (
              <Small>Not settled yet: the whole deposit is still held.</Small>
            ) : (
              <Small>Not tracked: this lease ended before the app recorded deposits, so it was settled outside the app. You can record what happened for the record.</Small>
            )}

            <Small>
              {d.documentCount > 0 ? (
                <button type="button" onClick={onOpenDocuments} className={textLink}>
                  {plural(d.documentCount, "refund proof")} in Documents
                </button>
              ) : (
                "No refund proof uploaded."
              )}
            </Small>
          </div>
        ) : null}
      </SectionCard>

      {settling && d && <SettlementModal lease={lease} deposit={d} title={settling} onClose={() => setSettling(null)} />}
      {uploading && (
        <Modal open onOpenChange={(open) => !open && setUploading(false)} title="Upload refund proof">
          <DocumentUpload
            target={{ owner: "leases", ownerId: lease.id }}
            defaultCategory="SECURITY_DEPOSIT"
            onUploaded={() => {
              void qc.invalidateQueries({ queryKey: depositKeys.deposit(lease.id) });
              setUploading(false);
            }}
            onCancel={() => setUploading(false)}
          />
        </Modal>
      )}
    </div>
  );
}

/** The header button's name, or null when there is nothing to settle (no deposit held). */
function settleAction(d: DepositResponse): string | null {
  if (toCents(d.totalHeld) === 0) return null;
  if (d.settlement) return "Edit settlement";
  return d.tracked ? "Settle deposit" : "Record settlement";
}

function subtitle(d: DepositResponse): string {
  const parts = [`Security ${formatCurrency(d.securityDeposit ?? "0")}`];
  if (toCents(d.petDeposit) > 0) parts.push(`Pet ${formatCurrency(d.petDeposit)}`);
  return parts.join(" · ");
}

function Row({ label, value, caption }: { label: ReactNode; value: ReactNode; caption?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <span className="block break-words text-text-primary">{label}</span>
        {caption && <Caption className="block break-words">{caption}</Caption>}
      </div>
      <div className="shrink-0 text-right">{value}</div>
    </div>
  );
}

/** The saved settlement: deductions, applied (with its DEPOSIT payment), refund and its details, settled on, notes. */
function SettlementDetails({ deposit, onShowPayment }: { deposit: DepositResponse; onShowPayment: (paymentId: string) => void }) {
  const s = deposit.settlement!;
  const refundDetails = [s.refundDate ? formatDate(s.refundDate) : null, s.refundMethod ? paymentMethodLabel(s.refundMethod) : null, s.refundReference].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border-subtle rounded-control border border-border-subtle px-4">
        {s.deductions.map((x) => (
          <Row key={x.id} label={x.reason} caption="Deduction" value={<Num>{formatCurrency(x.amount)}</Num>} />
        ))}
        {s.deductions.length > 1 && <Row label="Deductions total" value={<Num className="font-semibold">{formatCurrency(s.deductionsTotal)}</Num>} />}
        {s.deductions.length === 0 && <Row label="Deductions" value={<Num>{formatCurrency("0.00")}</Num>} />}
        <Row
          label="Applied to balance"
          caption={
            s.payment ? (
              <button type="button" onClick={() => onShowPayment(s.payment!.paymentId)} className={cn(textLink, "font-mono text-caption")}>
                {s.payment.paymentNumber}
              </button>
            ) : undefined
          }
          value={<Num>{formatCurrency(s.appliedToBalance)}</Num>}
        />
        <Row label="Refund" caption={refundDetails || undefined} value={<Num className="font-bold">{formatCurrency(s.refundAmount)}</Num>} />
      </div>
      <Small className="mt-2 block">Settled on {formatDate(s.settledOn)}</Small>
      {s.notes && <div className="mt-2 rounded-control bg-surface-2 p-3 text-small break-words whitespace-pre-line text-text-primary">{s.notes}</div>}
    </div>
  );
}
