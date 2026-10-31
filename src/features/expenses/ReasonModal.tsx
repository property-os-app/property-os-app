import { useState } from "react";
import { Body, Button, Textarea } from "@/components/atoms";
import { FormField, InlineError } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";

const MAX_REASON = 300;

export interface ReasonModalProps {
  title: string;
  /** Under the title, e.g. "$640.00 · Oct 1, 2026". */
  description?: string;
  /** What happens, above the field. */
  intro: string;
  confirmLabel: string;
  busyLabel: string;
  /** Red confirm button (void). */
  danger?: boolean;
  /** Runs the request with the trimmed reason; a thrown error stays inside the modal. Resolve to close. */
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

/**
 * A required reason (trimmed, 1–300 characters) for Reject and Void, like the ledger's void. Built on Modal because
 * ConfirmDialog has no field. "reason ..." validation messages go under the field, others (403, 409) at the top.
 * Mount it only while open.
 */
export function ReasonModal({ title, description, intro, confirmLabel, busyLabel, danger, onConfirm, onClose }: ReasonModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    const trimmed = reason.trim();
    setError(null);
    if (!trimmed) return setFieldError("Enter a reason.");
    if (trimmed.length > MAX_REASON) return setFieldError(`Keep the reason under ${MAX_REASON} characters.`);
    setFieldError(null);
    setBusy(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      const reasonMessages = err instanceof ApiError ? err.messages.filter((m) => m.startsWith("reason ")) : [];
      if (reasonMessages.length > 0) setFieldError(reasonMessages.join(". "));
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy} aria-busy={busy || undefined} onClick={() => void confirm()}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <Body className="m-0">{intro}</Body>
      {error && <InlineError title={error} />}
      <FormField label="Reason" htmlFor="reason-text" required error={fieldError} help={`${reason.trim().length} / ${MAX_REASON}`}>
        <Textarea id="reason-text" autoFocus maxLength={MAX_REASON} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} />
      </FormField>
    </Modal>
  );
}
