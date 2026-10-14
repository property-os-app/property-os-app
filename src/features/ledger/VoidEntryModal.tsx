import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Body, Button, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useVoidCharge, useVoidPayment } from "@/features/ledger/hooks";
import { reenterCharge, reenterPayment } from "@/features/ledger/reenter";
import type { LedgerEntry } from "@/types/ledger";

const MAX_VOID_REASON = 300;
/** How long the "voided" toast keeps its Undo button. */
const UNDO_MS = 10_000;

/**
 * Void one charge or payment (OWNER only) with a required reason (trimmed, 1–300 chars).
 * Built on Modal because ConfirmDialog has no field. Errors (400, 404, 409 "already voided") stay inside. Mount it only while open.
 * The success toast has Undo (10 s): it re-enters the same entry as a new one (reenter.ts).
 */
export function VoidEntryModal({ leaseId, entry, onClose }: { leaseId: string; entry: LedgerEntry; onClose: () => void }) {
  const qc = useQueryClient();
  const voidCharge = useVoidCharge();
  const voidPayment = useVoidPayment();
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCharge = entry.kind === "CHARGE";
  const busy = voidCharge.isPending || voidPayment.isPending;
  const noun = isCharge ? "charge" : "payment";

  const confirm = async () => {
    const trimmed = reason.trim();
    setError(null);
    if (!trimmed) return setFieldError("Enter a reason.");
    if (trimmed.length > MAX_VOID_REASON) return setFieldError(`Keep the reason under ${MAX_VOID_REASON} characters.`);
    setFieldError(null);
    try {
      // Undo re-creates the entry from the void response (the void itself stays). It runs after this modal closed.
      if (isCharge) {
        const saved = await voidCharge.mutateAsync({ leaseId, chargeId: entry.id, body: { reason: trimmed } });
        toast.success(`Charge ${saved.invoiceNumber} voided`, {
          duration: UNDO_MS,
          undo: () =>
            void reenterCharge(qc, saved).then(
              (again) => toast.success(`Re-entered as ${again.invoiceNumber}`),
              (err: unknown) => toast.error(`Couldn't re-enter ${saved.invoiceNumber}`, { description: errorText(err) }),
            ),
        });
      } else {
        const saved = await voidPayment.mutateAsync({ leaseId, paymentId: entry.id, body: { reason: trimmed } });
        toast.success(`Payment ${saved.paymentNumber} voided`, {
          duration: UNDO_MS,
          undo: () =>
            void reenterPayment(qc, saved).then(
              (again) => toast.success(`Re-entered as ${again.paymentNumber}`),
              (err: unknown) => toast.error(`Couldn't re-enter ${saved.paymentNumber}`, { description: errorText(err) }),
            ),
        });
      }
      onClose();
    } catch (err) {
      const reasonMessages = err instanceof ApiError ? err.messages.filter((m) => m.startsWith("reason ")) : [];
      if (reasonMessages.length > 0) setFieldError(reasonMessages.join(". "));
      else setError(errorText(err));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={`Void ${noun} ${entry.number}`}
      description={`${formatCurrency(entry.amount)} · ${formatDate(entry.date)}`}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} aria-busy={busy || undefined} onClick={() => void confirm()}>
            {busy ? "Voiding..." : `Void ${noun}`}
          </Button>
        </>
      }
    >
      <Body className="m-0">Voided entries stay in the ledger but stop counting in the balance. The void is permanent; Undo or Re-enter adds the {noun} again with a new number.</Body>
      {error && <InlineError title={error} />}
      <FormField label="Reason" htmlFor="void-reason" required error={fieldError} help={`${reason.trim().length} / ${MAX_VOID_REASON}`}>
        <Textarea id="void-reason" autoFocus maxLength={MAX_VOID_REASON} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} />
      </FormField>
    </Modal>
  );
}
