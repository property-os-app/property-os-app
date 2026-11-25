import { useState } from "react";
import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { useDeleteDocument } from "@/features/documents/hooks";
import type { Document, DocumentRef } from "@/types/document";

export interface DocumentDeleteDialogProps {
  /** The record the document belongs to. */
  target: DocumentRef;
  /** The document to delete; null keeps the dialog closed. */
  doc: Document | null;
  onClose: () => void;
}

/** Delete one document (DELETE /{owner}/:id/documents/:docId). Errors show inside the dialog. */
export function DocumentDeleteDialog({ target, doc, onClose }: DocumentDeleteDialogProps) {
  const remove = useDeleteDocument();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = () => {
    if (!doc) return;
    setError(null);
    remove.mutate(
      { target, docId: doc.id },
      {
        onSuccess: () => {
          toast.success(`Deleted ${doc.name}`);
          close();
        },
        onError: (err) => setError(errorText(err)),
      },
    );
  };

  return (
    <ConfirmDialog
      open={doc !== null}
      onOpenChange={(open) => !open && close()}
      title={doc ? `Delete ${doc.name}?` : "Delete document?"}
      consequence="The file is removed for good. It can't be undone."
      confirmLabel="Delete document"
      destructive
      onConfirm={confirm}
      busy={remove.isPending}
      error={error}
    />
  );
}
