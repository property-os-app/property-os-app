import { useState } from "react";
import { Download, FileImage, FileText, Trash2 } from "lucide-react";
import { Badge, Button, Caption, H3, Small } from "@/components/atoms";
import { Card, KebabMenu, ListCard, toast } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatFileSize } from "@/lib/files";
import { formatTimestampDate } from "@/lib/format";
import { documentCategoryLabel } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { DocumentDeleteDialog } from "@/features/documents/DocumentDeleteDialog";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { useDocuments, useDownloadDocument } from "@/features/documents/hooks";
import type { Document, DocumentOwner } from "@/types/document";

export interface DocumentsPanelProps {
  owner: DocumentOwner;
  ownerId: string;
  /** Upload and delete (the owner record's edit permission, `canManageDocuments`). Hidden, never disabled, without it. */
  canManage: boolean;
  /** Empty-state text, e.g. "No documents on this lease yet." */
  emptyText?: string;
}

/** PDF or image icon by content type. */
function DocIcon({ doc }: { doc: Document }) {
  const Icon = doc.contentType === "application/pdf" ? FileText : FileImage;
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-3 text-text-muted">
      <Icon size={16} strokeWidth={1.5} aria-label={doc.contentType === "application/pdf" ? "PDF" : "Image"} />
    </span>
  );
}

/**
 * The documents of one lease, tenant, unit or property: upload card (with permission) and the list (DataTable from md,
 * CardList on phones, 5 states). Download asks for a fresh signed link on the click; Delete confirms first.
 */
export function DocumentsPanel({ owner, ownerId, canManage, emptyText = "No documents yet." }: DocumentsPanelProps) {
  const docs = useDocuments(owner, ownerId);
  const download = useDownloadDocument();
  const isMobile = useIsMobile();
  const [deleting, setDeleting] = useState<Document | null>(null);

  const onDownload = (doc: Document) => download.mutate(doc.id, { onError: (err) => toast.error(`Couldn't download ${doc.name}`, { description: errorText(err) }) });
  const pendingId = download.isPending ? download.variables : null;

  const state = docs.isError ? "error" : docs.isPending ? "loading" : docs.data.length === 0 ? "empty" : "ideal";
  const empty = { title: "No documents", description: canManage ? `${emptyText} Upload one above.` : emptyText };
  const error = { title: "Couldn't load documents", description: errorText(docs.error), onRetry: () => void docs.refetch() };
  const meta = (d: Document) => `${documentCategoryLabel(owner, d.category)} · ${formatFileSize(d.sizeBytes)}`;

  const columns: Column<Document>[] = [
    {
      key: "name",
      header: "Document",
      cell: (d) => (
        <div className="flex min-w-0 items-center gap-3">
          <DocIcon doc={d} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold text-text-primary" title={d.name}>
              {d.name}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" dot={false}>
                {documentCategoryLabel(owner, d.category)}
              </Badge>
              <Caption className="tabular">{formatFileSize(d.sizeBytes)}</Caption>
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      cell: (d) => (
        <div className="flex min-w-0 flex-col">
          <Small className="text-text-primary">{formatTimestampDate(d.createdAt)}</Small>
          <Caption className="truncate" title={d.uploadedBy.email}>
            {d.uploadedBy.email}
          </Caption>
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<Download size={16} strokeWidth={1.5} />}
            disabled={pendingId === d.id}
            aria-busy={pendingId === d.id || undefined}
            aria-label={`Download ${d.name}`}
            onClick={() => onDownload(d)}
          >
            {pendingId === d.id ? "Downloading..." : "Download"}
          </Button>
          {canManage && (
            <Button size="sm" variant="ghost" iconOnly aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
              <Trash2 size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <Card className="flex flex-col gap-4">
          <H3>Upload a document</H3>
          <DocumentUpload owner={owner} ownerId={ownerId} />
        </Card>
      )}
      {isMobile ? (
        <CardList
          rows={docs.data ?? []}
          rowKey={(d) => d.id}
          caption="Documents"
          skeletons={2}
          state={state}
          empty={empty}
          error={error}
          renderCard={(d) => (
            <ListCard
              leading={<DocIcon doc={d} />}
              title={d.name}
              subtitle={meta(d)}
              facts={[
                { label: "Uploaded", value: formatTimestampDate(d.createdAt) },
                { label: "By", value: d.uploadedBy.email },
              ]}
              onOpen={() => onDownload(d)}
              openLabel={`Download ${d.name}`}
              actions={
                <KebabMenu
                  label={`Actions for ${d.name}`}
                  items={[
                    { label: "Download", icon: <Download strokeWidth={1.5} />, onSelect: () => onDownload(d) },
                    ...(canManage ? [{ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => setDeleting(d) }] : []),
                  ]}
                />
              }
            />
          )}
        />
      ) : (
        <DataTable columns={columns} rows={docs.data ?? []} rowKey={(d) => d.id} density="compact" caption="Documents" state={state} empty={empty} error={error} />
      )}
      <DocumentDeleteDialog owner={owner} ownerId={ownerId} doc={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
