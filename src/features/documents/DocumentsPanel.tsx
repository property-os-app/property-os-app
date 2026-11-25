import { useState } from "react";
import { Link } from "react-router";
import { Download, Eye, FileImage, FileText, Trash2 } from "lucide-react";
import { Badge, Button, Caption, H3, Small } from "@/components/atoms";
import { Card, KebabMenu, ListCard, toast } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/files";
import { formatTimestampDate } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { canManageDocuments } from "@/features/auth/permissions";
import { DocumentDeleteDialog } from "@/features/documents/DocumentDeleteDialog";
import { DocumentUpload } from "@/features/documents/DocumentUpload";
import { categoryLabel } from "@/features/documents/categories";
import { useDocumentCategories, useDocuments, useDownloadDocument, useViewDocument } from "@/features/documents/hooks";
import { ownerOfDocument, sourceText } from "@/features/documents/source";
import { openBlankTab, POPUP_BLOCKED_MESSAGE } from "@/features/documents/view";
import { textLink } from "@/features/shared/linkClass";
import type { DocumentRef, ListedDocument } from "@/types/document";

export interface DocumentsPanelProps {
  target: DocumentRef;
  /** A unit's list: router state for the links to the leases. */
  leaseState?: unknown;
  /** A lease's list: a payment file's source opens the Ledger tab. */
  onOpenLedger?: () => void;
  /** Empty-state text, e.g. "No documents on this lease yet." */
  emptyText?: string;
}

/** Table View / Download: icon-only squares (like Delete) while the panel is under 48rem wide, so the drawer tables don't scroll sideways. */
const NARROW_ICON_ONLY = "@max-3xl:w-8 @max-3xl:px-0";

/** PDF or image icon by content type. */
function DocIcon({ doc }: { doc: ListedDocument }) {
  const Icon = doc.contentType === "application/pdf" ? FileText : FileImage;
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-3 text-text-muted">
      <Icon size={16} strokeWidth={1.5} aria-label={doc.contentType === "application/pdf" ? "PDF" : "Image"} />
    </span>
  );
}

/**
 * The documents of one lease, tenant, unit, property or payment: upload card (with permission) and the list (DataTable from md,
 * CardList on phones, 5 states). View opens a new tab and Download saves the file, each with a fresh signed link on the
 * click (a phone card tap views); Delete confirms first. A lease's list has its payments' files
 * too, a unit's list its leases' documents and theirs: each row shows its source, takes its label from its own record's
 * categories and deletes through that record, with that record's permission (`canManageDocuments`; hidden without it).
 */
export function DocumentsPanel({ target, leaseState, onOpenLedger, emptyText = "No documents yet." }: DocumentsPanelProps) {
  const { me } = useAuth();
  const docs = useDocuments(target);
  const canManage = canManageDocuments(me!, target.owner);
  const ofPayment = target.owner === "payments";
  // Labels from the owner type's own list; a readable fallback while it loads (or fails), never blank.
  const categories = useDocumentCategories();
  const label = (d: ListedDocument) => categoryLabel(categories.data, ownerOfDocument(d, target).owner, d.category);
  const canDelete = (d: ListedDocument) => canManageDocuments(me!, ownerOfDocument(d, target).owner);
  /** "Unit", a link to the lease (its Ledger tab for a payment's file), or "Payment PMT-…" opening this lease's Ledger tab. */
  const source = (d: ListedDocument) => {
    const text = sourceText(d, target);
    // Sits on top of a phone card's stretched button.
    const linkClass = cn(textLink, "pointer-events-auto relative text-left");
    if (text && d.source?.leaseId) {
      return (
        <Link to={`/leases/${encodeURIComponent(d.source.leaseId)}?tab=${d.paymentId ? "ledger" : "documents"}`} state={leaseState} className={linkClass}>
          {text}
        </Link>
      );
    }
    if (text && d.paymentId && onOpenLedger) {
      return (
        <button type="button" onClick={onOpenLedger} className={linkClass}>
          {text}
        </button>
      );
    }
    return text;
  };
  const download = useDownloadDocument();
  const view = useViewDocument();
  const isMobile = useIsMobile();
  const [deleting, setDeleting] = useState<ListedDocument | null>(null);

  const onDownload = (doc: ListedDocument) => download.mutate(doc.id, { onError: (err) => toast.error(`Couldn't download ${doc.name}`, { description: errorText(err) }) });
  const pendingId = download.isPending ? download.variables : null;

  // The tab must open in the click itself (before any await) or popup blockers stop it.
  const onView = (doc: ListedDocument) => {
    const tab = openBlankTab();
    if (!tab) {
      toast.error(`Couldn't open ${doc.name}`, { description: POPUP_BLOCKED_MESSAGE });
      return;
    }
    view.mutate(
      { docId: doc.id, tab },
      {
        onError: (err) => {
          tab.close(); // showInTab already closes it; this also covers any other failure (closing twice is harmless).
          toast.error(`Couldn't open ${doc.name}`, { description: errorText(err) });
        },
      },
    );
  };
  const viewingId = view.isPending ? view.variables?.docId : null;

  const state = docs.isError ? "error" : docs.isPending ? "loading" : docs.data.length === 0 ? "empty" : "ideal";
  const empty = { title: ofPayment ? "No files" : "No documents", description: canManage ? `${emptyText} ${ofPayment ? "Add" : "Upload"} one above.` : emptyText };
  const error = { title: "Couldn't load documents", description: errorText(docs.error), onRetry: () => void docs.refetch() };
  const meta = (d: ListedDocument) => `${label(d)} · ${formatFileSize(d.sizeBytes)}`;

  const columns: Column<ListedDocument>[] = [
    {
      key: "name",
      header: "Document",
      cell: (d) => (
        <div className="flex min-w-0 items-center gap-3 py-1.5">
          <DocIcon doc={d} />
          {/* Capped in narrow panels (drawers) so long names and labels truncate instead of widening the table. */}
          <div className="flex min-w-0 flex-col gap-1 @max-3xl:max-w-[180px]">
            <span className="truncate font-semibold text-text-primary" title={d.name}>
              {d.name}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" dot={false} className="max-w-full" title={label(d)}>
                <span className="truncate">{label(d)}</span>
              </Badge>
              <Caption className="tabular">{formatFileSize(d.sizeBytes)}</Caption>
            </span>
            {/* Wraps: "Lease … · Payment …" is longer than a narrow panel's column. */}
            {source(d) && <Caption className="whitespace-normal">{source(d)}</Caption>}
          </div>
        </div>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      cell: (d) => (
        <div className="flex min-w-0 flex-col @max-3xl:max-w-[140px]">
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
            icon={<Eye size={16} strokeWidth={1.5} />}
            disabled={viewingId === d.id}
            aria-busy={viewingId === d.id || undefined}
            aria-label={`View ${d.name}`}
            title="View"
            onClick={() => onView(d)}
            className={NARROW_ICON_ONLY}
          >
            <span className="hidden @3xl:inline">{viewingId === d.id ? "Opening..." : "View"}</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Download size={16} strokeWidth={1.5} />}
            disabled={pendingId === d.id}
            aria-busy={pendingId === d.id || undefined}
            aria-label={`Download ${d.name}`}
            title="Download"
            onClick={() => onDownload(d)}
            className={NARROW_ICON_ONLY}
          >
            <span className="hidden @3xl:inline">{pendingId === d.id ? "Downloading..." : "Download"}</span>
          </Button>
          {canDelete(d) && (
            <Button size="sm" variant="ghost" iconOnly aria-label={`Delete ${d.name}`} onClick={() => setDeleting(d)}>
              <Trash2 size={16} strokeWidth={1.5} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    // A size container: in narrow places (the tenant and unit drawers) View and Download show only their icons.
    <div className="@container flex flex-col gap-4">
      {canManage && (
        <Card className="flex flex-col gap-4">
          <H3>{ofPayment ? "Add a file" : "Upload a document"}</H3>
          <DocumentUpload target={target} />
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
              note={source(d) ?? undefined}
              onOpen={() => onView(d)}
              openLabel={`View ${d.name}`}
              actions={
                <KebabMenu
                  label={`Actions for ${d.name}`}
                  items={[
                    { label: "View", icon: <Eye strokeWidth={1.5} />, onSelect: () => onView(d) },
                    { label: "Download", icon: <Download strokeWidth={1.5} />, onSelect: () => onDownload(d) },
                    ...(canDelete(d) ? [{ label: "Delete", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => setDeleting(d) }] : []),
                  ]}
                />
              }
            />
          )}
        />
      ) : (
        <DataTable columns={columns} rows={docs.data ?? []} rowKey={(d) => d.id} density="compact" caption="Documents" state={state} empty={empty} error={error} />
      )}
      <DocumentDeleteDialog target={deleting ? ownerOfDocument(deleting, target) : target} doc={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
