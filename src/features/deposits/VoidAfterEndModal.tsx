import { useState } from "react";
import { Button, Num, Skeleton, Small } from "@/components/atoms";
import { InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatDate, formatMonth } from "@/lib/format";
import { plural } from "@/lib/labels";
import { balanceAfterEnd, chargesTotal } from "@/features/deposits/endPreview";
import { BalanceLine, PreviewList } from "@/features/deposits/EndPreviewParts";
import { useEndPreview, useVoidChargesAfterEnd } from "@/features/deposits/hooks";
import type { Lease } from "@/types/lease";

/**
 * "Void rent after end date" on an ENDED / TERMINATED lease (money.void): shows the end preview's rent charges first (with what
 * was paid, which becomes credit), then POST /leases/:id/void-charges-after-end. Mount it only while open.
 */
export function VoidAfterEndModal({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const preview = useEndPreview(lease.id, "");
  const voidAfter = useVoidChargesAfterEnd(lease.id);
  const [error, setError] = useState("");
  const p = preview.data;
  const toVoid = p?.chargesToVoid ?? [];

  const confirm = async () => {
    setError("");
    try {
      const done = await voidAfter.mutateAsync();
      toast.success(done.voidedCharges.length > 0 ? `${plural(done.voidedCharges.length, "rent charge")} voided on ${done.leaseNumber}` : `Nothing to void on ${done.leaseNumber}`);
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const after = p?.endedOn ? formatMonth(p.endedOn.slice(0, 7)) : "the end";
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !voidAfter.isPending && onClose()}
      title={`Void rent after the end date · ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={voidAfter.isPending} onClick={onClose}>
            {toVoid.length > 0 ? "Cancel" : "Close"}
          </Button>
          {toVoid.length > 0 && (
            <Button variant="danger" disabled={voidAfter.isPending} aria-busy={voidAfter.isPending || undefined} onClick={() => void confirm()}>
              {voidAfter.isPending ? "Voiding..." : `Void ${plural(toVoid.length, "charge")}`}
            </Button>
          )}
        </>
      }
    >
      {error && <InlineError title="Couldn't void the charges" description={error} />}
      {preview.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-16" />
        </div>
      ) : preview.isError ? (
        <InlineError title="Couldn't check the charges after the end date" description={errorText(preview.error)} onRetry={() => void preview.refetch()} />
      ) : p ? (
        <>
          {toVoid.length === 0 ? (
            <Small>{p.cancelled ? "No rent is left to void on this cancelled lease." : `No rent is billed for months after ${after}: nothing to void.`}</Small>
          ) : (
            <>
              <Small>
                {p.cancelled ? "This lease was cancelled before it started. " : `The lease ended on ${formatDate(p.endedOn)}. `}
                These {plural(toVoid.length, "rent charge")} <Num>({formatCurrency(chargesTotal(toVoid))})</Num> will be voided with the reason "
                {p.cancelled ? "Lease cancelled before it started" : "Lease ended early"}". Late fees and other charges are never voided here.
              </Small>
              <PreviewList charges={toVoid} />
            </>
          )}
          <BalanceLine now={p.balanceNow} after={toVoid.length > 0 ? balanceAfterEnd(p, true) : null} />
        </>
      ) : null}
    </Modal>
  );
}
