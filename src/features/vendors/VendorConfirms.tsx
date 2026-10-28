import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useArchiveVendor, useDeleteVendor } from "@/features/vendors/hooks";
import type { Vendor } from "@/types/vendor";

/** "Archive {name}?": hidden from new expenses, existing expenses keep it. The backend's 409 shows inside. null keeps it closed. */
export function ArchiveVendorDialog({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const archive = useArchiveVendor();
  return (
    <ConfirmDialog
      open={vendor !== null}
      onOpenChange={(open) => {
        if (!open) {
          archive.reset();
          onClose();
        }
      }}
      title={`Archive ${vendor?.name ?? "vendor"}?`}
      consequence="It can't be picked on new expenses. Expenses that already use it keep it, and you can unarchive it any time."
      confirmLabel="Archive vendor"
      onConfirm={() => {
        if (!vendor) return;
        archive.mutate(
          { id: vendor.id, archive: true },
          {
            onSuccess: (saved) => {
              toast.success(`${saved.name} archived`);
              archive.reset();
              onClose();
            },
          },
        );
      }}
      busy={archive.isPending}
      error={archive.isError ? errorText(archive.error) : null}
    />
  );
}

/** "Delete {name}?" (destructive), offered only while no expense uses it; the backend's 409 ("… Archive it instead.") shows inside. */
export function DeleteVendorDialog({ vendor, onClose, onDeleted }: { vendor: Vendor | null; onClose: () => void; onDeleted?: () => void }) {
  const del = useDeleteVendor();
  return (
    <ConfirmDialog
      open={vendor !== null}
      onOpenChange={(open) => {
        if (!open) {
          del.reset();
          onClose();
        }
      }}
      title={`Delete ${vendor?.name ?? "vendor"}?`}
      consequence="This permanently deletes the vendor. A vendor used by any expense, even a voided one, can't be deleted: archive it instead."
      confirmLabel="Delete vendor"
      destructive
      onConfirm={() => {
        if (!vendor) return;
        del.mutate(vendor.id, {
          onSuccess: () => {
            toast.success(`Vendor ${vendor.name} deleted`);
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
