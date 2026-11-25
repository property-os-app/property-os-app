import { Badge } from "@/components/atoms";
import { Drawer } from "@/components/organisms";
import { formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/labels";
import { DocumentsPanel } from "@/features/documents/DocumentsPanel";
import type { LedgerEntry } from "@/types/ledger";

/**
 * One payment's files (receipts, check photos, transfer confirmations): the Documents panel in an lg drawer. Adding and
 * deleting need payment.create. Works on a voided payment too. Mount it only while open.
 */
export function PaymentFilesDrawer({ leaseId, entry, onClose }: { leaseId: string; entry: LedgerEntry; onClose: () => void }) {
  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title="Files"
      description={[entry.number, formatCurrency(entry.amount), entry.method ? paymentMethodLabel(entry.method) : null, formatDate(entry.date)].filter(Boolean).join(" · ")}
      status={entry.voided ? <Badge tone="neutral">Voided</Badge> : undefined}
    >
      <DocumentsPanel target={{ owner: "payments", ownerId: entry.id, leaseId }} emptyText="No files on this payment yet." />
    </Drawer>
  );
}
