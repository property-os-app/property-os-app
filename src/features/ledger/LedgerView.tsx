import { useMemo, useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Badge, Caption, Dash, Num } from "@/components/atoms";
import { KebabMenu, type MenuItem } from "@/components/molecules";
import { DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { currentMonthUTC, formatCurrency, formatDate } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/labels";
import { AddChargeModal } from "@/features/ledger/AddChargeModal";
import { useLedger } from "@/features/ledger/hooks";
import { BalanceText } from "@/features/ledger/LedgerParts";
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

type Reentry = { from: string } & ({ kind: "PAYMENT"; values: PaymentPrefill } | { kind: "CHARGE"; values: ChargePrefill });

export interface LedgerViewProps {
  lease: Lease;
  /** Void (OWNER). */
  canVoid: boolean;
  /** Re-enter a voided charge (charge.create). */
  canCharge: boolean;
  /** Re-enter a voided payment (payment.create). */
  canPay: boolean;
}

/**
 * The lease ledger table (lease page, Ledger tab), newest first. Kebab: Void on live rows (`canVoid`),
 * Re-enter on voided rows (opens Add charge / Record Payment prefilled, so the user checks before saving).
 */
export function LedgerView({ lease, canVoid, canCharge, canPay }: LedgerViewProps) {
  const ledger = useLedger(lease.id);
  const [voiding, setVoiding] = useState<LedgerEntry | null>(null);
  const [reentry, setReentry] = useState<Reentry | null>(null);

  // The API sends oldest first; the design shows newest first.
  const rows = useMemo(() => (ledger.data ? [...ledger.data.entries].reverse() : []), [ledger.data]);
  const showActions = canVoid || canCharge || canPay;

  const columns = useMemo<Column<LedgerEntry>[]>(() => {
    const menuItems = (e: LedgerEntry): MenuItem[] => {
      if (!e.voided) {
        return canVoid
          ? [{ label: e.kind === "CHARGE" ? "Void charge" : "Void payment", icon: <Ban strokeWidth={1.5} />, destructive: true, onSelect: () => setVoiding(e) }]
          : [];
      }
      const allowed = e.kind === "CHARGE" ? canCharge : canPay;
      const prefill = prefillFromEntry(e);
      if (!allowed || !prefill) return [];
      return [{ label: e.kind === "CHARGE" ? "Re-enter charge" : "Re-enter payment", icon: <RotateCcw strokeWidth={1.5} />, onSelect: () => setReentry({ from: e.number, ...prefill }) }];
    };

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
      { key: "method", header: "Method", cell: (e) => (e.method ? <span className={cn(e.voided && "text-text-muted")}>{paymentMethodLabels[e.method]}</span> : <Dash />) },
      { key: "charge", header: "Charge", align: "right", cell: (e) => (e.kind === "CHARGE" ? <Amount entry={e} /> : <Dash />) },
      { key: "payment", header: "Payment", align: "right", cell: (e) => (e.kind === "PAYMENT" ? <Amount entry={e} className="text-success" /> : <Dash />) },
      { key: "balance", header: "Balance", align: "right", cell: (e) => <BalanceText value={e.runningBalance} className={cn(e.voided && "text-text-muted")} /> },
    ];
    if (showActions) {
      cols.push({
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 48,
        cell: (e) => {
          const items = menuItems(e);
          return items.length > 0 ? <KebabMenu label={`Actions for ${e.number}`} items={items} /> : null;
        },
      });
    }
    return cols;
  }, [canVoid, canCharge, canPay, showActions]);

  const state = ledger.isError ? "error" : ledger.isPending ? "loading" : rows.length === 0 ? "empty" : "ideal";
  const balance = ledger.data?.summary.balance;

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => `${e.kind}-${e.id}`}
        state={state}
        density="compact"
        caption="Ledger"
        empty={{ title: "No charges or payments yet", description: "Generate rent or add a charge to start the ledger." }}
        error={{ title: "Couldn't load the ledger", description: ledger.isError ? errorText(ledger.error) : undefined, onRetry: () => void ledger.refetch() }}
      />

      {voiding && <VoidEntryModal leaseId={lease.id} entry={voiding} onClose={() => setVoiding(null)} />}
      {reentry?.kind === "CHARGE" && (
        <AddChargeModal leaseId={lease.id} month={currentMonthUTC()} reentry={{ from: reentry.from, values: reentry.values }} onClose={() => setReentry(null)} />
      )}
      {reentry?.kind === "PAYMENT" && balance !== undefined && (
        <RecordPaymentModal
          targets={[leasePaymentTarget(lease, balance)]}
          presetLeaseId={lease.id}
          reentry={{ from: reentry.from, values: reentry.values }}
          onClose={() => setReentry(null)}
        />
      )}
    </>
  );
}
