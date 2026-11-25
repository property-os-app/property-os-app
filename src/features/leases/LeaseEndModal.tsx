import { useState } from "react";
import { Body, Button, Input } from "@/components/atoms";
import { FormField, InlineError, SegmentedControl, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatDate, todayUTC } from "@/lib/format";
import { useEndLease } from "@/features/leases/hooks";
import { defaultEndedOn, endedOnError, isNotStarted, splitEndedOnErrors } from "@/features/leases/leaseEnd";
import type { Lease } from "@/types/lease";
import { unitLabel } from "@/lib/labels";

type EndStatus = "ENDED" | "TERMINATED";

/**
 * POST /leases/:id/end. "End lease {number}": Ended (term finished) or Terminated (ended early), and the day it ended.
 * A lease that hasn't started has neither: "Cancel lease {number}" (the API sets cancelledOn). Mount it only while open.
 */
export function LeaseEndModal({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const end = useEndLease();
  // Fixed while open: the refetch after saving must not turn one form into the other.
  const [cancels] = useState(() => isNotStarted(lease));
  const [status, setStatus] = useState<EndStatus>("ENDED");
  const [endedOn, setEndedOn] = useState(() => defaultEndedOn(lease.startDate));
  const [dateError, setDateError] = useState("");
  const [error, setError] = useState("");

  const confirm = async () => {
    setError("");
    const invalid = cancels ? null : endedOnError(endedOn, lease.startDate);
    setDateError(invalid ?? "");
    if (invalid) return;
    try {
      const saved = await end.mutateAsync({ id: lease.id, body: cancels ? { status: "ENDED" } : { status, endedOn } });
      toast.success(`Lease ${saved.leaseNumber} ${saved.cancelledOn ? "cancelled" : saved.status === "TERMINATED" ? "terminated" : "ended"}`);
      onClose();
    } catch (err) {
      const split = err instanceof ApiError && err.messages.length > 0 ? splitEndedOnErrors(err.messages) : { field: "", form: errorText(err) };
      // Without the date field everything shows at the top.
      setDateError(cancels ? "" : split.field);
      setError(cancels ? [split.form, split.field].filter(Boolean).join(" ") : split.form);
    }
  };

  const label = cancels ? "Cancel lease" : "End lease";
  return (
    <Modal
      open
      onOpenChange={(open) => !open && !end.isPending && onClose()}
      title={`${label} ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={end.isPending} onClick={onClose}>
            {cancels ? "Keep lease" : "Cancel"}
          </Button>
          <Button variant="danger" disabled={end.isPending} aria-busy={end.isPending || undefined} onClick={() => void confirm()}>
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
              }}
            />
          </FormField>
        </>
      )}
      <Body className="m-0">
        {unitLabel(lease.unit.unitNumber)} becomes vacant if it has no other active lease. Charges and payments stay in the ledger.
      </Body>
    </Modal>
  );
}
