import { useState } from "react";
import { Download, ExternalLink, Eye, FileText, Hash, Upload } from "lucide-react";
import { Badge, Button, Caption, Skeleton, Small } from "@/components/atoms";
import { IconTile, IconTileGrid, SectionCard, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { openPdfInNewTab, saveBlob } from "@/lib/pdf";
import { useAuth } from "@/features/auth/authContext";
import { canManageDocuments } from "@/features/auth/permissions";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { FileKindIcon } from "@/features/documents/FileKindIcon";
import { canViewInBrowser, fileKind } from "@/features/documents/fileKind";
import { useDocuments } from "@/features/documents/hooks";
import { SIGNED_LEASE_CATEGORY, signedCopies } from "@/features/documents/signed";
import { useDocumentActions } from "@/features/documents/useDocumentActions";
import { useLeaseDocument } from "@/features/leases/hooks";
import { templateLine } from "@/features/leases/stats";
import { CopyButton } from "@/features/shared/CopyButton";
import { textLink } from "@/features/shared/linkClass";
import { NotSet } from "@/features/shared/Missing";
import type { Lease } from "@/types/lease";

/**
 * Details tab "Lease" card: Lease number (Copy) and Lease template tiles, then the Lease document row: Preview PDF (new
 * tab, opened on the click so it isn't blocked as a pop-up) and Download PDF ("LSE-….pdf"), only with a template; the
 * newest signed copy (SIGNED_LEASE, View only for types a browser shows, Download); "Upload signed lease" (lease document
 * permission) opens the document upload in a modal with Signed lease preselected. `onOpenDocuments`: the Documents tab.
 */
export function LeaseCard({ lease, canEdit, onOpenDocuments }: { lease: Lease; canEdit: boolean; onOpenDocuments: () => void }) {
  const { me } = useAuth();
  const canUpload = canManageDocuments(me!, "leases");
  const [uploading, setUploading] = useState(false);
  const line = templateLine(lease);

  return (
    <SectionCard title="Lease" subtitle="Agreement, template and documents">
      <IconTileGrid>
        <IconTile
          icon={<Hash strokeWidth={1.5} />}
          label="Lease number"
          value={lease.leaseNumber}
          valueClassName="font-mono"
          action={<CopyButton text={lease.leaseNumber} what="lease number" />}
        />
        <IconTile
          icon={<FileText strokeWidth={1.5} />}
          label="Lease template"
          value={line ?? <NotSet />}
          badge={lease.template?.archived ? <Badge tone="neutral">Archived</Badge> : undefined}
        />
      </IconTileGrid>

      <div className="flex flex-col gap-3 rounded-control border border-border-subtle p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="font-semibold text-text-primary">Lease document</div>
          {canUpload && (
            <Button size="sm" icon={<Upload size={14} strokeWidth={1.5} />} onClick={() => setUploading(true)} className="max-md:h-11">
              Upload signed lease
            </Button>
          )}
        </div>
        <PdfActions lease={lease} canEdit={canEdit} hasTemplate={line !== null} />
        <SignedCopy lease={lease} onOpenDocuments={onOpenDocuments} />
      </div>

      {uploading && (
        <Modal open onOpenChange={(open) => !open && setUploading(false)} title="Upload signed lease" description={lease.leaseNumber} size="lg">
          <DocumentUpload
            target={{ owner: "leases", ownerId: lease.id }}
            defaultCategory={SIGNED_LEASE_CATEGORY}
            onUploaded={() => setUploading(false)}
            onCancel={() => setUploading(false)}
          />
        </Modal>
      )}
    </SectionCard>
  );
}

/** Preview / Download PDF with their own loading states and backend messages as a toast; the reason when there's no PDF. */
function PdfActions({ lease, canEdit, hasTemplate }: { lease: Lease; canEdit: boolean; hasTemplate: boolean }) {
  const previewPdf = useLeaseDocument();
  const downloadPdf = useLeaseDocument();

  if (!hasTemplate) {
    // An old lease never prints: its signed copy is the document.
    if (lease.isHistorical) return null;
    return (
      <div className="flex flex-col gap-1">
        <Small>No template, so this lease has no PDF yet.</Small>
        {canEdit && lease.status !== "ENDED" && lease.status !== "TERMINATED" && <Caption>Edit the lease to pick a template.</Caption>}
      </div>
    );
  }

  const preview = () => {
    openPdfInNewTab(() => previewPdf.mutateAsync({ id: lease.id, download: false }).then((r) => r.blob)).catch((err: unknown) => toast.error(errorText(err)));
  };
  const download = () =>
    downloadPdf.mutate(
      { id: lease.id, download: true },
      {
        onSuccess: ({ blob, filename }) => saveBlob(blob, filename ?? `${lease.leaseNumber}.pdf`),
        onError: (err) => toast.error(errorText(err)),
      },
    );

  return (
    <>
      <Caption>Made from this version with the lease's current details.{lease.status === "DRAFT" ? " Drafts print with a DRAFT watermark." : ""}</Caption>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<ExternalLink size={16} strokeWidth={1.5} />}
          onClick={preview}
          disabled={previewPdf.isPending}
          aria-busy={previewPdf.isPending || undefined}
          className="max-md:min-h-11 max-md:flex-1"
        >
          {previewPdf.isPending ? "Making PDF..." : "Preview PDF"}
        </Button>
        <Button
          icon={<Download size={16} strokeWidth={1.5} />}
          onClick={download}
          disabled={downloadPdf.isPending}
          aria-busy={downloadPdf.isPending || undefined}
          className="max-md:min-h-11 max-md:flex-1"
        >
          {downloadPdf.isPending ? "Making PDF..." : "Download PDF"}
        </Button>
      </div>
    </>
  );
}

/** The newest signed copy from the lease's documents (the query the page already loads), "+N more" opening the Documents tab. */
function SignedCopy({ lease, onOpenDocuments }: { lease: Lease; onOpenDocuments: () => void }) {
  const docs = useDocuments({ owner: "leases", ownerId: lease.id });
  const { onView, onDownload, viewingId, downloadingId } = useDocumentActions();

  if (docs.isPending) return <Skeleton className="h-9" />;
  if (docs.isError)
    return (
      <Small>
        Couldn't load the signed copy.{" "}
        <button type="button" onClick={() => void docs.refetch()} className={textLink}>
          Retry
        </button>
      </Small>
    );

  const [copy, ...more] = signedCopies(docs.data);
  if (!copy) return <Small>No signed copy uploaded yet.</Small>;
  return (
    <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <FileKindIcon kind={fileKind(copy.contentType)} />
          <span className="min-w-0 text-small break-words text-text-primary [overflow-wrap:anywhere]">
            <span className="font-semibold">Signed copy</span> · {copy.name}
          </span>
        </div>
        <div className="flex shrink-0 gap-2 max-md:w-full">
          {canViewInBrowser(copy.contentType) && (
            <Button
              size="sm"
              icon={<Eye size={14} strokeWidth={1.5} />}
              onClick={() => onView(copy)}
              disabled={viewingId === copy.id}
              aria-busy={viewingId === copy.id || undefined}
              aria-label={`View ${copy.name}`}
              className="max-md:h-11 max-md:flex-1"
            >
              {viewingId === copy.id ? "Opening..." : "View"}
            </Button>
          )}
          <Button
            size="sm"
            icon={<Download size={14} strokeWidth={1.5} />}
            onClick={() => onDownload(copy)}
            disabled={downloadingId === copy.id}
            aria-busy={downloadingId === copy.id || undefined}
            aria-label={`Download ${copy.name}`}
            className="max-md:h-11 max-md:flex-1"
          >
            {downloadingId === copy.id ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>
      {more.length > 0 && (
        <button type="button" onClick={onOpenDocuments} className={`${textLink} self-start text-small`}>
          +{more.length} more in Documents
        </button>
      )}
    </div>
  );
}
