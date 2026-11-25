import { useMemo, useState } from "react";
import { Ban, Paperclip, RotateCcw } from "lucide-react";
import { Badge, Button, Caption, Dash, Num } from "@/components/atoms";
import { KebabMenu, ListCard, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { currentMonthUTC, formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabel, plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { useLedger } from "@/features/ledger/hooks";
import { BalanceText } from "@/features/ledger/LedgerParts";
import { PaymentFilesDrawer } from "@/features/ledger/PaymentFilesDrawer";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { leasePaymentTarget } from "@/features/ledger/targets";
import { prefillFromEntry, type ChargePrefill, type PaymentPrefill } from "@/features/ledger/reenter";
import { VoidEntryModal } from "@/features/ledger/VoidEntryModal";
import type { Lease } from "@/types/lease";
import type { LedgerEntry } from "@/types/ledger";

/** Amount cell: muted with strikethrough when voided. */
function Amount({ entry, className }: { entry: LedgerEntry; className?: string }) {
  return <Num className={cn(entry.voided ? "text-text-muted line-through" : className)}>{formatCurrency(entry.amount)}</Num>;
}

/** A payment's paperclip shows when it has files, or when the user can add one. Never on a charge. */
const showsFiles = (e: LedgerEntry, canAdd: boolean) => e.kind === "PAYMENT" && (canAdd || (e.documentCount ?? 0) > 0);

/** The paperclip of a payment, with how many files it has (muted without any); opens them. */
function FilesButton({ entry, onOpen }: { entry: LedgerEntry; onOpen: () => void }) {
  const count = entry.documentCount ?? 0;
  const label = count === 0 ? `Add a file to ${entry.number}` : `${plural(count, "file")} of ${entry.number}`;
  return (
    <Button
      size="sm"
      variant="ghost"
      iconOnly={count === 0}
      icon={count > 0 ? <Paperclip size={16} strokeWidth={1.5} /> : undefined}
      aria-label={label}
      title={label}
      onClick={onOpen}
      className={cn("max-md:h-11 max-md:min-w-11", count === 0 ? "text-text-muted" : "px-2 tabular")}
    >
      {count > 0 ? count : <Paperclip size={16} strokeWidth={1.5} />}
    </Button>
  );
}

type Reentry = { from: string } & ({ kind: "PAYMENT"; values: PaymentPrefill } | { kind: "CHARGE"; values: ChargePrefill });

export interface LedgerViewProps {
  lease: Lease;
  /** Void (OWNER). */
  canVoid: boolean;
  /** Re-enter a voided charge (charge.create). */
  canCharge: boolean;
  /** Re-enter a voided payment, add and delete payment files (payment.create). */
  canPay: boolean;
}

/**
 * The lease ledger table (lease page, Ledger tab), newest first; cards on phones (not tappable, only the kebab acts).
 * A payment's paperclip opens its files (`PaymentFilesDrawer`), voided payments too.
 * Kebab: Void on live rows (`canVoid`), Re-enter on voided rows (opens Add charge / Record Payment prefilled, so the user checks before saving).
 */
export function LedgerView({ lease, canVoid, canCharge, canPay }: LedgerViewProps) {
  const ledger = useLedger(lease.id);
  const [voiding, setVoiding] = useState<LedgerEntry | null>(null);
  const [reentry, setReentry] = useState<Reentry | null>(null);
  const [filesId, setFilesId] = useState<string | null>(null);

  // The API sends oldest first; the design shows newest first.
  const rows = useMemo(() => (ledger.data ? [...ledger.data.entries].reverse() : []), [ledger.data]);
  const showActions = canVoid || canCharge || canPay;
  const isMobile = useIsMobile();
  const showFiles = rows.some((e) => showsFiles(e, canPay));
  // From the rows, so a refetch (a void, another file) shows in the open drawer.
  const filesOf = rows.find((e) => e.kind === "PAYMENT" && e.id === filesId);

  /** Void or Re-enter for one entry, or null when the role can do neither. */
  const kebab = useMemo(
    () => (e: LedgerEntry) => {
      let items: MenuItem[] = [];
      if (!e.voided) {
        if (canVoid) items = [{ label: e.kind === "CHARGE" ? "Void charge" : "Void payment", icon: <Ban strokeWidth={1.5} />, destructive: true, onSelect: () => setVoiding(e) }];
      } else {
        const allowed = e.kind === "CHARGE" ? canCharge : canPay;
        const prefill = prefillFromEntry(e);
        if (allowed && prefill) {
          items = [{ label: e.kind === "CHARGE" ? "Re-enter charge" : "Re-enter payment", icon: <RotateCcw strokeWidth={1.5} />, onSelect: () => setReentry({ from: e.number, ...prefill }) }];
        }
      }
      return items.length > 0 ? <KebabMenu label={`Actions for ${e.number}`} items={items} /> : null;
    },
    [canVoid, canCharge, canPay],
  );

  const columns = useMemo<Column<LedgerEntry>[]>(() => {
    const cols: Column<LedgerEntry>[] = [
      { key: "date", header: "Date", cell: (e) => <span className={cn(e.voided && "text-text-muted")}>{formatDate(e.date)}</span> },
      {
        key: "description",
        header: "Description",
        className: "w-full whitespace-normal py-2",
        cell: (e) => (
          <div className={cn("flex min-w-40 flex-col", e.voided && "text-text-muted")}>
            <span className="flex flex-wrap items-center gap-2">
              {e.kind === "CHARGE" ? e.description : "Payment received"}
              {e.voided && <Badge tone="neutral">Voided</Badge>}
            </span>
            <Caption>{e.number}</Caption>
            {e.voided && e.voidReason && <Caption>Reason: {e.voidReason}</Caption>}
          </div>
        ),
      },
      { key: "method", header: "Method", cell: (e) => (e.method ? <span className={cn(e.voided && "text-text-muted")}>{paymentMethodLabel(e.method)}</span> : <Dash />) },
      { key: "charge", header: "Charge", align: "right", cell: (e) => (e.kind === "CHARGE" ? <Amount entry={e} /> : <Dash />) },
      { key: "payment", header: "Payment", align: "right", cell: (e) => (e.kind === "PAYMENT" ? <Amount entry={e} className="text-success" /> : <Dash />) },
      { key: "balance", header: "Balance", align: "right", cell: (e) => <BalanceText value={e.runningBalance} className={cn(e.voided && "text-text-muted")} /> },
    ];
    if (showFiles) {
      cols.push({ key: "files", header: <span className="sr-only">Files</span>, width: 64, cell: (e) => showsFiles(e, canPay) && <FilesButton entry={e} onOpen={() => setFilesId(e.id)} /> });
    }
    if (showActions) cols.push({ key: "actions", header: <span className="sr-only">Actions</span>, width: 48, cell: kebab });
    return cols;
  }, [showActions, showFiles, canPay, kebab]);

  const state = ledger.isError ? "error" : ledger.isPending ? "loading" : rows.length === 0 ? "empty" : "ideal";
  const balance = ledger.data?.summary.balance;
  const empty = { title: "No charges or payments yet", description: "Rent is billed automatically before each due date. You can also add a charge." };
  const error = { title: "Couldn't load the ledger", description: ledger.isError ? errorText(ledger.error) : undefined, onRetry: () => void ledger.refetch() };

  return (
    <>
      {isMobile ? (
        <CardList
          rows={rows}
          rowKey={(e) => `${e.kind}-${e.id}`}
          state={state}
          caption="Ledger"
          empty={empty}
          error={error}
          renderCard={(e) => (
            <ListCard
              muted={e.voided}
              title={e.kind === "CHARGE" ? e.description : "Payment received"}
              subtitle={[e.number, formatDate(e.date), e.method ? paymentMethodLabel(e.method) : null].filter(Boolean).join(" · ")}
              badge={
                <>
                  {e.kind === "CHARGE" ? <Badge tone="neutral">Charge</Badge> : <Badge tone="success">Payment</Badge>}
                  {e.voided && <Badge tone="neutral">Voided</Badge>}
                </>
              }
              amount={{ value: <Amount entry={e} className={e.kind === "PAYMENT" ? "text-success" : undefined} /> }}
              facts={[
                { label: "Balance after", value: <BalanceText value={e.runningBalance} className={cn(e.voided && "text-text-muted")} /> },
                // Not next to the kebab: it would push the date out of the card's second line.
                ...(showsFiles(e, canPay)
                  ? [
                      {
                        label: "Files",
                        value: (
                          <span className="pointer-events-auto relative -mx-2 inline-flex">
                            <FilesButton entry={e} onOpen={() => setFilesId(e.id)} />
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
              note={e.voided && e.voidReason ? `Reason: ${e.voidReason}` : undefined}
              actions={showActions ? kebab(e) : undefined}
            />
          )}
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(e) => `${e.kind}-${e.id}`} state={state} density="compact" caption="Ledger" empty={empty} error={error} />
      )}

      {filesOf && <PaymentFilesDrawer leaseId={lease.id} entry={filesOf} onClose={() => setFilesId(null)} />}
      {voiding && <VoidEntryModal leaseId={lease.id} entry={voiding} onClose={() => setVoiding(null)} />}
      {reentry?.kind === "CHARGE" && (
        <AddChargeModal leaseId={lease.id} month={currentMonthUTC()} reentry={{ from: reentry.from, values: reentry.values }} onClose={() => setReentry(null)} />
      )}
      {reentry?.kind === "PAYMENT" && balance !== undefined && (
        <RecordPaymentModal
          targets={[leasePaymentTarget(lease, balance)]}
          presetLeaseId={lease.id}
          reentry={{ from: reentry.from, values: reentry.values }}
          // The ledger is right here, under the modal.
          onOpenLedger={() => {}}
          onClose={() => setReentry(null)}
        />
      )}
    </>
  );
}
