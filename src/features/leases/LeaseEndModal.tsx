import { useState } from "react";
import { Body, Button } from "@/components/atoms";
import { InlineError, SegmentedControl, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useEndLease } from "@/features/leases/hooks";
import type { Lease } from "@/types/lease";

type EndStatus = "ENDED" | "TERMINATED";

/** "End lease {number}": Ended (term finished) or Terminated (ended early). POST /leases/:id/end. Mount it only while open. */
export function LeaseEndModal({ lease, onClose }: { lease: Lease; onClose: () => void }) {
  const end = useEndLease();
  const [status, setStatus] = useState<EndStatus>("ENDED");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      const saved = await end.mutateAsync({ id: lease.id, body: { status } });
      toast.success(`Lease ${saved.leaseNumber} ${saved.status === "TERMINATED" ? "terminated" : "ended"}`);
      onClose();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !end.isPending && onClose()}
      title={`End lease ${lease.leaseNumber}`}
      footer={
        <>
          <Button disabled={end.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={end.isPending} aria-busy={end.isPending || undefined} onClick={() => void confirm()}>
            {end.isPending ? "Ending..." : "End lease"}
          </Button>
        </>
      }
    >
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
      <Body className="m-0">
        Unit {lease.unit.unitNumber} becomes vacant if it has no other active lease. Charges and payments stay in the ledger.
      </Body>
      {error && <InlineError title={error} />}
    </Modal>
  );
}
