import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useDeleteUnit } from "@/features/units/hooks";
import type { Unit } from "@/types/unit";

export interface UnitDeleteDialogProps {
  /** The unit to delete; null keeps the dialog closed. */
  unit: Unit | null;
  propertyName?: string;
  onClose: () => void;
  /** After a successful delete (e.g. close the drawer). */
  onDeleted?: () => void;
}

/** "Delete unit?" confirm (OWNER). The backend's 409 ("This unit has leases...", "related records") shows inside the dialog. */
export function UnitDeleteDialog({ unit, propertyName, onClose, onDeleted }: UnitDeleteDialogProps) {
  const del = useDeleteUnit();
  const name = unit ? `Unit ${unit.unitNumber}${propertyName ? `, ${propertyName}` : ""}` : "";

  return (
    <ConfirmDialog
      open={unit !== null}
      onOpenChange={(open) => {
        if (!open) {
          del.reset();
          onClose();
        }
      }}
      title="Delete unit?"
      consequence={`This permanently deletes ${name}. A unit that has any lease, even a draft, can't be deleted.`}
      confirmLabel="Delete unit"
      destructive
      onConfirm={() => {
        if (!unit) return;
        del.mutate(unit.id, {
          onSuccess: () => {
            toast.success(`Unit ${unit.unitNumber} deleted`);
            del.reset();
            onClose();
            onDeleted?.();
          },
        });
      }}
      busy={del.isPending}
      error={del.isError ? errorText(del.error) : null}
    />
  );
}
