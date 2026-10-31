import { ExternalLink, RefreshCw } from "lucide-react";
import { Button, Caption, Skeleton, Small } from "@/components/atoms";
import { Card, InlineError } from "@/components/molecules";
import { useIsMobile } from "@/lib/useIsMobile";
import type { PdfPreview } from "@/features/lease-templates/usePdfPreview";

interface Props {
  preview: PdfPreview;
  onRefresh: () => void;
  /** The text changed since the shown preview. */
  stale: boolean;
  /** Why the preview can't load now (empty body, unknown fields), or null. */
  blocked: string | null;
}

/**
 * The editor's Preview tab: the backend's PDF with sample data and a SAMPLE watermark, in a frame from md up. Phones get an
 * "Open preview PDF" button instead (phone browsers show PDFs in frames badly). "Refresh preview" reloads it; nothing loads on typing.
 */
export function TemplatePreview({ preview, onRefresh, stale, blocked }: Props) {
  const isMobile = useIsMobile();
  const { url, loading, error } = preview;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Caption>Sample data, with a SAMPLE watermark. This is the page that prints.</Caption>
        <Button
          size="sm"
          icon={<RefreshCw size={14} strokeWidth={1.5} className={loading ? "animate-spin motion-reduce:animate-none" : undefined} />}
          onClick={onRefresh}
          disabled={loading || blocked !== null}
          aria-busy={loading || undefined}
          className="max-md:min-h-11"
        >
          {loading ? "Loading preview..." : "Refresh preview"}
        </Button>
      </div>

      {blocked && (
        <Card padding="compact" className="border-warning/40 bg-warning-soft">
          <Small className="text-text-primary">{blocked}</Small>
        </Card>
      )}
      {!blocked && stale && url && !loading && <Small className="text-warning">The text changed since this preview. Refresh to see the changes.</Small>}
      {error && <InlineError title="Couldn't make the preview" description={error} onRetry={blocked ? undefined : onRefresh} />}

      {loading && !url && <Skeleton className="h-[60vh] w-full" />}
      {url &&
        (isMobile ? (
          <Card className="flex flex-col items-start gap-3">
            <Small>The preview PDF is ready.</Small>
            <Button variant="primary" icon={<ExternalLink size={16} strokeWidth={1.5} />} onClick={() => window.open(url, "_blank", "noopener")} className="min-h-11">
              Open preview PDF
            </Button>
          </Card>
        ) : (
          <iframe
            src={url}
            title="Template preview (PDF)"
            className={`min-h-[60vh] w-full flex-1 rounded-card border border-border-subtle bg-surface-2 ${loading ? "opacity-60" : ""}`}
          />
        ))}
    </div>
  );
}
