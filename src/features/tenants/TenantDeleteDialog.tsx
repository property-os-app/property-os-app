import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useDeleteTenant } from "@/features/tenants/hooks";

export interface TenantDeleteDialogProps {
  /** The tenant to delete; null keeps the dialog closed. */
  tenant: { id: string; fullName: string } | null;
  onClose: () => void;
  /** After a successful delete (e.g. close the drawer). */
  onDeleted?: () => void;
}

/** "Delete tenant?" confirm (OWNER). The backend's 409 ("still has 2 lease(s)") shows inside the dialog. */
export function TenantDeleteDialog({ tenant, onClose, onDeleted }: TenantDeleteDialogProps) {
  const del = useDeleteTenant();

  return (
    <ConfirmDialog
      open={tenant !== null}
      onOpenChange={(open) => {
        if (!open) {
          del.reset();
          onClose();
        }
      }}
      title="Delete tenant?"
      consequence={`This permanently deletes ${tenant?.fullName ?? ""}. A tenant who is on any lease, even a draft, can't be deleted.`}
      confirmLabel="Delete tenant"
      destructive
      onConfirm={() => {
        if (!tenant) return;
        del.mutate(tenant.id, {
          onSuccess: () => {
            toast.success(`Tenant ${tenant.fullName} deleted`);
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
