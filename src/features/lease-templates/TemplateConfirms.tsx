import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { plural } from "@/lib/labels";
import { useArchiveTemplate, useDeleteTemplate } from "@/features/lease-templates/hooks";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";

interface Props {
  template: LeaseTemplateListItem;
  onClose: () => void;
}

/** "Archive {name}?": hides it from new leases and clears the default; leases on it keep it. The backend 409 shows inside. Mount only while open. */
export function ArchiveTemplateDialog({ template, onClose }: Props) {
  const archive = useArchiveTemplate();
  const used = template.leaseCount > 0 ? ` ${plural(template.leaseCount, "lease")} on it keep it and their PDFs still work.` : "";
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && !archive.isPending && onClose()}
      title={`Archive ${template.name}?`}
      consequence={`It can't be picked for new leases${template.isDefault ? " and stops being the default" : ""}.${used} You can unarchive it later.`}
      confirmLabel="Archive"
      busy={archive.isPending}
      error={archive.isError ? errorText(archive.error) : null}
      onConfirm={() =>
        archive.mutate(
          { id: template.id, archive: true },
          {
            onSuccess: (saved) => {
              toast.success(`Archived ${saved.name}`);
              onClose();
            },
          },
        )
      }
    />
  );
}

/** "Delete {name}?" for an unused template (its versions go with it). A 409 ("used by n lease(s)") shows inside. Mount only while open. */
export function DeleteTemplateDialog({ template, onClose }: Props) {
  const remove = useDeleteTemplate();
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && !remove.isPending && onClose()}
      title={`Delete ${template.name}?`}
      consequence="The template and all its versions are deleted. This can't be undone."
      confirmLabel="Delete template"
      destructive
      busy={remove.isPending}
      error={remove.isError ? errorText(remove.error) : null}
      onConfirm={() =>
        remove.mutate(template.id, {
          onSuccess: (deleted) => {
            toast.success(`Deleted ${deleted.name}`);
            onClose();
          },
        })
      }
    />
  );
}
