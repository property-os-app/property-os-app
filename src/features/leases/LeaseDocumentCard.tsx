import { Download, ExternalLink } from "lucide-react";
import { Badge, Button, Caption, H3, Small } from "@/components/atoms";
import { toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { openPdfInNewTab, saveBlob } from "@/lib/pdf";
import { useLeaseDocument } from "@/features/leases/hooks";
import { templateLine } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

/**
 * Details tab card: the lease's template and version, with Preview PDF (new tab, opened on the click so it isn't blocked as a
 * pop-up) and Download PDF ("LSE-….pdf" from Content-Disposition). Both only when the lease has a template; each shows
 * its own loading state. Errors (the backend JSON message) show as a toast.
 */
export function LeaseDocumentCard({ lease, canEdit }: { lease: Lease; canEdit: boolean }) {
  const previewPdf = useLeaseDocument();
  const downloadPdf = useLeaseDocument();
  const line = templateLine(lease);

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
    <div className="flex flex-col gap-3">
      <H3>Lease document</H3>
      {line ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Small className="font-semibold text-text-primary">{line}</Small>
            {lease.template?.archived && <Badge tone="neutral">Archived</Badge>}
          </div>
          <Caption>
            Made from this version with the lease's current details.{lease.status === "DRAFT" ? " Drafts print with a DRAFT watermark." : ""}
          </Caption>
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
      ) : (
        <>
          <Small>No template, so this lease has no PDF yet.</Small>
          {canEdit && lease.status !== "ENDED" && lease.status !== "TERMINATED" && <Caption>Edit the lease to pick a template.</Caption>}
        </>
      )}
    </div>
  );
}
