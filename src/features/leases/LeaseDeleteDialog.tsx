import { useState } from "react";
import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useDeleteLease } from "@/features/leases/hooks";
import type { Lease } from "@/types/lease";

export interface LeaseDeleteDialogProps {
  /** The draft to delete; null keeps the dialog closed. */
  lease: Lease | null;
  onClose: () => void;
  /** After a successful delete (e.g. close the drawer). */
  onDeleted?: () => void;
}

/** Delete a DRAFT lease (DELETE /leases/:id). A 409 shows inside the dialog. */
export function LeaseDeleteDialog({ lease, onClose, onDeleted }: LeaseDeleteDialogProps) {
  const remove = useDeleteLease();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!lease) return;
    setError(null);
    try {
      await remove.mutateAsync(lease.id);
      toast.success(`Draft lease ${lease.leaseNumber} deleted`);
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
      title={lease ? `Delete draft lease ${lease.leaseNumber}?` : "Delete draft lease?"}
      consequence={lease ? `This removes the draft for Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}. It can't be undone.` : ""}
      confirmLabel="Delete draft"
      destructive
      onConfirm={() => void confirm()}
      busy={remove.isPending}
      error={error}
    />
  );
}
