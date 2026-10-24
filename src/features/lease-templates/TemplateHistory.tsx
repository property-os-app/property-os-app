import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Badge, Button, Caption, Skeleton, Small } from "@/components/atoms";
import { Card, InlineError, toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { formatTimestampDate } from "@/lib/format";
import { plural } from "@/lib/labels";
import { openPdfInNewTab } from "@/lib/pdf";
import { useTemplatePreviewPdf, useTemplateVersion } from "@/features/lease-templates/hooks";
import type { LeaseTemplateDetail, LeaseTemplateVersionSummary } from "@/types/leaseTemplate";

/** The saved text of one version, loaded when shown. */
function VersionBody({ templateId, version }: { templateId: string; version: number }) {
  const v = useTemplateVersion(templateId, version);
  if (v.isPending) return <Skeleton className="h-32 w-full" />;
  if (v.isError) return <InlineError title={`Couldn't load version ${version}`} description={errorText(v.error)} onRetry={() => void v.refetch()} />;
  return (
    <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-control border border-border-subtle bg-surface-2 p-3 font-mono text-small text-text-primary">
      {v.data.body}
    </pre>
  );
}

function VersionRow({ template, v }: { template: LeaseTemplateDetail; v: LeaseTemplateVersionSummary }) {
  const [open, setOpen] = useState(false);
  const pdf = useTemplatePreviewPdf();
  const current = v.version === template.currentVersion;

  const preview = () => {
    openPdfInNewTab(() => pdf.mutateAsync({ id: template.id, version: v.version }).then((r) => r.blob)).catch((err: unknown) => toast.error(errorText(err)));
  };

  return (
    <li className="flex flex-col gap-3 border-b border-border-subtle py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">Version {v.version}</span>
            {current && <Badge tone="success">Current</Badge>}
          </div>
          <Caption className="block">
            {formatTimestampDate(v.createdAt)} · {v.createdBy.name} · {v.leaseCount === 0 ? "No leases" : `Used by ${plural(v.leaseCount, "lease")}`}
          </Caption>
        </div>
        <div className="flex gap-2 max-md:w-full">
          <Button
            size="sm"
            icon={open ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="max-md:min-h-11 max-md:flex-1"
          >
            {open ? "Hide text" : "View text"}
          </Button>
          <Button
            size="sm"
            icon={<ExternalLink size={14} strokeWidth={1.5} />}
            onClick={preview}
            disabled={pdf.isPending}
            aria-busy={pdf.isPending || undefined}
            className="max-md:min-h-11 max-md:flex-1"
          >
            {pdf.isPending ? "Loading..." : "Preview PDF"}
          </Button>
        </div>
      </div>
      {open && <VersionBody templateId={template.id} version={v.version} />}
    </li>
  );
}

/** The History tab: every saved version, newest first (read-only). Each shows its text on request and opens its sample PDF in a new tab. */
export function TemplateHistory({ template }: { template: LeaseTemplateDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <Small>Versions never change. Each lease keeps the version it was created with, even when you save a newer one.</Small>
      <Card padding="compact">
        <ul className="m-0 list-none p-0">
          {template.versions.map((v) => (
            <VersionRow key={v.id} template={template} v={v} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
