import { useState } from "react";
import { Body, Button, Checkbox, Input, Num, Skeleton, Small } from "@/components/atoms";
import { FormField, InlineError, SegmentedControl, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatCurrency, formatDate, formatMonth, todayUTC, toCents } from "@/lib/format";
import { plural, unitLabel } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { balanceAfterEnd, chargesTotal, endBody, endMaxApplicable, endToast, leaseDepositTotal } from "@/features/deposits/endPreview";
import { BalanceLine, PreviewList } from "@/features/deposits/EndPreviewParts";
import { useEndPreview } from "@/features/deposits/hooks";
import { SettlementForm } from "@/features/deposits/SettlementForm";
import {
  canSaveSettlement,
  settlementBody,
  settlementDefaults,
  settlementErrors,
  splitSettlementErrors,
  type SettlementContext,
  type SettlementErrors,
  type SettlementValues,
} from "@/features/deposits/settlement";
import { useEndLease } from "@/features/leases/hooks";
import { defaultEndedOn, endedOnError, endedOnServerError, isNotStarted } from "@/features/leases/leaseEnd";
import type { EndPreview } from "@/types/deposit";
import type { Lease } from "@/types/lease";

type EndStatus = "ENDED" | "TERMINATED";

/**
 * POST /leases/:id/end. "End lease {number}": Ended (term finished) or Terminated (ended early), and the day it ended.
 * A lease that hasn't started has neither: "Cancel lease {number}" (the API sets cancelledOn).
 * The end preview (GET /leases/:id/end-preview, reloaded on each valid date) shows the rent billed for months after the end
 * ("Void these N rent charges", on by default, money.void), the other charges after it (information only), the balance now →
 * after, and an optional "Settle the deposit now" (SettlementForm, money.record). Confirm sends it all in one call.
 * Mount it only while open.
 */
export function LeaseEndModal({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const end = useEndLease();
  const { me } = useAuth();
  const canVoid = me ? can(me, "entry.void") : false;
  const canSettle = me ? can(me, "deposit.settle") : false;
  // Fixed while open: the refetch after saving must not turn one form into the other.
  const [cancels] = useState(() => isNotStarted(lease));
  const [today] = useState(() => todayUTC());
  const [status, setStatus] = useState<EndStatus>("ENDED");
  const [endedOn, setEndedOn] = useState(() => defaultEndedOn(lease.startDate));
  const [dateError, setDateError] = useState("");
  const [error, setError] = useState("");
  const [voidCharges, setVoidCharges] = useState(true);
  const [settleNow, setSettleNow] = useState(false);
  const [settlement, setSettlement] = useState<SettlementValues>(() => settlementDefaults({ settlement: null, suggested: null, totalHeld: leaseDepositTotal(lease) }, today));
  const [submitted, setSubmitted] = useState(false);
  const [settlementServer, setSettlementServer] = useState<SettlementErrors>({});

  const dateOk = cancels || endedOnError(endedOn, lease.startDate) === null;
  const preview = useEndPreview(lease.id, cancels ? "" : endedOn, { enabled: dateOk });
  const p = dateOk ? preview.data : undefined;
  const toVoid = p?.chargesToVoid ?? [];
  const voiding = canVoid && voidCharges && toVoid.length > 0;
  const totalHeld = p?.deposit.totalHeld ?? leaseDepositTotal(lease);
  const offerSettle = canSettle && toCents(totalHeld) > 0;

  const ctx: SettlementContext = {
    totalHeld,
    maxApplicable: p ? endMaxApplicable(p, voiding) : "0.00",
    minSettledOn: cancels ? today : endedOn,
    today,
  };
  const localErrors = settlementErrors(settlement, ctx);
  const shownErrors: SettlementErrors = submitted ? { ...localErrors, ...settlementServer } : { appliedToBalance: localErrors.appliedToBalance, ...settlementServer };
  const settling = offerSettle && settleNow;

  const confirm = async () => {
    setError("");
    setSettlementServer({});
    const invalid = cancels ? null : endedOnError(endedOn, lease.startDate);
    setDateError(invalid ?? "");
    if (invalid) return;
    if (settling) {
      setSubmitted(true);
      if (!canSaveSettlement(settlement, ctx)) {
        setError("Finish the deposit settlement first: every dollar must be assigned ($0.00 left).");
        return;
      }
    }
    try {
      const saved = await end.mutateAsync({
        id: lease.id,
        body: endBody({ cancels, status, endedOn, voidCharges: voiding, deposit: settling ? settlementBody(settlement) : null }),
      });
      toast.success(endToast(saved));
      onClose();
    } catch (err) {
      if (!(err instanceof ApiError) || err.messages.length === 0) {
        setError(errorText(err));
        return;
      }
      const onDate: string[] = [];
      const rest: string[] = [];
      for (const m of err.messages) {
        const field = endedOnServerError(m);
        if (field && !cancels) onDate.push(field);
        else rest.push(m);
      }
      setDateError(onDate.join(". "));
      if (settling) {
        const split = splitSettlementErrors(rest, settlement.deductions.map((d) => d.key));
        setSettlementServer(split.errors);
        setError(split.form.join(" ") || (Object.keys(split.errors).length > 0 ? "Check the deposit settlement below." : ""));
      } else setError(rest.join(" "));
    }
  };

  const label = cancels ? "Cancel lease" : "End lease";
  return (
    <Modal
      open
      size="lg"
      onOpenChange={(open) => !open && !end.isPending && onClose()}
      title={`${label} ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={end.isPending} onClick={onClose}>
            {cancels ? "Keep lease" : "Cancel"}
          </Button>
          <Button variant="danger" disabled={end.isPending || (dateOk && preview.isPending)} aria-busy={end.isPending || undefined} onClick={() => void confirm()}>
            {end.isPending ? (cancels ? "Cancelling..." : "Ending...") : label}
          </Button>
        </>
      }
    >
      {error && <InlineError title={error} />}
      {cancels ? (
        <Body className="m-0">
          This lease hasn't started: it starts on {formatDate(lease.startDate)}. Ending it now cancels it, and it is kept as cancelled (the tenant never moved in). This can't be undone.
        </Body>
      ) : (
        <>
          <SegmentedControl<EndStatus>
            aria-label="How the lease ends"
            value={status}
            onChange={setStatus}
            segments={[
              { value: "ENDED", label: "Ended (term finished)" },
              { value: "TERMINATED", label: "Terminated (ended early)" },
            ]}
            className="w-fit max-w-full flex-wrap"
          />
          <FormField label="End date" htmlFor="le-date" required help="The day the lease really ended, up to today." error={dateError}>
            <Input
              id="le-date"
              type="date"
              value={endedOn}
              disabled={end.isPending}
              min={lease.startDate ?? undefined}
              max={todayUTC()}
              onChange={(e) => {
                setEndedOn(e.target.value);
                setDateError("");
                setError("");
              }}
            />
          </FormField>
        </>
      )}

      {dateOk && (
        <PreviewSection
          preview={p}
          loading={preview.isPending}
          error={preview.isError ? errorText(preview.error) : null}
          onRetry={() => void preview.refetch()}
          cancels={cancels}
          canVoid={canVoid}
          voidCharges={voidCharges}
          onVoidCharges={setVoidCharges}
          voiding={voiding}
        />
      )}

      {p && offerSettle && (
        <section className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          <Checkbox
            checked={settleNow}
            disabled={end.isPending}
            onChange={(e) => setSettleNow(e.target.checked)}
            label={
              <span>
                Settle the deposit now <Small as="span">({formatCurrency(totalHeld)} held, optional: it can be settled later from the lease)</Small>
              </span>
            }
          />
          {settleNow && (
            <SettlementForm
              values={settlement}
              onChange={(next) => {
                setSettlement(next);
                setSettlementServer({});
              }}
              ctx={ctx}
              openBalance={balanceAfterEnd(p, voiding)}
              securityDeposit={p.deposit.securityDeposit}
              petDeposit={p.deposit.petDeposit}
              errors={shownErrors}
              disabled={end.isPending}
            />
          )}
        </section>
      )}

      <Body className="m-0">
        {unitLabel(lease.unit.unitNumber)} becomes vacant if it has no other active lease. Charges and payments stay in the ledger.
      </Body>
    </Modal>
  );
}

interface PreviewSectionProps {
  preview: EndPreview | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  cancels: boolean;
  canVoid: boolean;
  voidCharges: boolean;
  onVoidCharges: (on: boolean) => void;
  voiding: boolean;
}

/** What ending changes: the rent after the end (void checkbox), the other charges after it, and the balance now → after. */
function PreviewSection({ preview: p, loading, error, onRetry, cancels, canVoid, voidCharges, onVoidCharges, voiding }: PreviewSectionProps) {
  if (error) return <InlineError title="Couldn't check the charges after the end date" description={error} onRetry={onRetry} />;
  if (loading || !p) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  const toVoid = p.chargesToVoid;
  const after = p.endedOn ? formatMonth(p.endedOn.slice(0, 7)) : "the end";
  return (
    <section className="flex flex-col gap-3 border-t border-border-subtle pt-4" aria-label="Charges after the end date">
      {toVoid.length === 0 ? (
        <Small>{cancels ? "No rent is billed on this lease." : `No rent is billed for months after ${after}.`}</Small>
      ) : (
        <>
          {canVoid ? (
            <Checkbox
              checked={voidCharges}
              onChange={(e) => onVoidCharges(e.target.checked)}
              label={
                <span>
                  Void these {plural(toVoid.length, "rent charge")} <Num>({formatCurrency(chargesTotal(toVoid))})</Num>
                </span>
              }
            />
          ) : (
            <Small>
              {plural(toVoid.length, "rent charge")} {toVoid.length === 1 ? "is" : "are"} billed {cancels ? "on this lease" : `for months after ${after}`}. Someone who can void charges can void them after ending.
            </Small>
          )}
          <PreviewList charges={toVoid} muted={!voiding} />
          {!cancels && <Small>No proration: a month only partly after the end date keeps its rent.</Small>}
        </>
      )}
      {p.otherChargesAfterEnd.length > 0 && (
        <div className="flex flex-col gap-2">
          <Small className="font-semibold text-text-primary">Other charges after the end date</Small>
          <PreviewList charges={p.otherChargesAfterEnd} muted />
          <Small>Not voided automatically. Void them by hand in the ledger if they shouldn't stay.</Small>
        </div>
      )}
      <BalanceLine now={p.balanceNow} after={balanceAfterEnd(p, voiding)} />
    </section>
  );
}
