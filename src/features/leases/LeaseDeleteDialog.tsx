import { useState } from "react";
import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useDeleteLease } from "@/features/leases/hooks";
import type { Lease } from "@/types/lease";
import { unitLabel } from "@/lib/labels";

export interface LeaseDeleteDialogProps {
  /** The draft or old lease to delete; null keeps the dialog closed. */
  lease: Lease | null;
  onClose: () => void;
  /** After a successful delete (e.g. close the drawer). */
  onDeleted?: () => void;
}

/** Delete a DRAFT or an old (history-only) lease (DELETE /leases/:id). A 409 (e.g. it still has documents) shows inside the dialog. */
export function LeaseDeleteDialog({ lease, onClose, onDeleted }: LeaseDeleteDialogProps) {
  const remove = useDeleteLease();
  const [error, setError] = useState<string | null>(null);
  const kind = lease?.isHistorical ? "old lease" : "draft lease";
  const where = lease ? `${unitLabel(lease.unit.unitNumber)}, ${lease.unit.property.name}` : "";

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!lease) return;
    setError(null);
    try {
      await remove.mutateAsync(lease.id);
      toast.success(`${lease.isHistorical ? "Old lease" : "Draft lease"} ${lease.leaseNumber} deleted`);
      close();
      onDeleted?.();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <ConfirmDialog
      open={lease !== null}
      onOpenChange={(open) => !open && close()}
      title={lease ? `Delete ${kind} ${lease.leaseNumber}?` : "Delete lease?"}
      consequence={
        lease
          ? lease.isHistorical
            ? `This removes the old lease record for ${where}. It can't be undone.`
            : `This removes the draft for ${where}. It can't be undone.`
          : ""
      }
      confirmLabel={lease?.isHistorical ? "Delete old lease" : "Delete draft"}
      destructive
      onConfirm={() => void confirm()}
      busy={remove.isPending}
      error={error}
    />
  );
}
