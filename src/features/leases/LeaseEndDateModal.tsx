import { useState } from "react";
import { Button, Input } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatDate, todayUTC } from "@/lib/format";
import { useUpdateLease } from "@/features/leases/hooks";
import { endedOnError, splitEndedOnErrors } from "@/features/leases/leaseEnd";
import { friendlyLeaseMessage } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

/**
 * "Edit end date": corrects the day an ended or terminated lease ended (PATCH endedOn), for a lease that `canEditEndDate`.
 * A lease without a recorded day starts empty, so nobody saves a guess. Mount it only while open.
 */
export function LeaseEndDateModal({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const update = useUpdateLease();
  const [endedOn, setEndedOn] = useState(lease.endedOn ?? "");
  const [dateError, setDateError] = useState("");
  const [error, setError] = useState("");
  const busy = update.isPending;

  const save = async () => {
    setError("");
    const invalid = endedOnError(endedOn, lease.startDate);
    setDateError(invalid ?? "");
    if (invalid) return;
    if (endedOn === lease.endedOn) return onClose();
    try {
      await update.mutateAsync({ id: lease.id, body: { endedOn } });
      toast.success("End date updated");
      onClose();
    } catch (err) {
      const split = err instanceof ApiError && err.messages.length > 0 ? splitEndedOnErrors(err.messages, friendlyLeaseMessage) : { field: "", form: errorText(err) };
      setDateError(split.field);
      setError(split.form);
    }
  };

  const planned = `Planned end: ${formatDate(lease.endDate)}.`;
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Edit end date"
      description={`Lease ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="end-date-form" disabled={busy} aria-busy={busy || undefined}>
            {busy ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      {error && <InlineError title={error} />}
      <form
        id="end-date-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void save();
        }}
      >
        <FormField label="End date" htmlFor="ed-date" required help={lease.endedOn ? planned : `Not recorded yet. ${planned}`} error={dateError}>
          <Input
            id="ed-date"
            type="date"
            value={endedOn}
            disabled={busy}
            min={lease.startDate ?? undefined}
            max={todayUTC()}
            onChange={(e) => {
              setEndedOn(e.target.value);
              setDateError("");
            }}
          />
        </FormField>
      </form>
    </Modal>
  );
}
