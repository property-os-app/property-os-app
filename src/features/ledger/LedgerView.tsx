import { useMemo, useState } from "react";
import { Ban } from "lucide-react";
import { Badge, Caption, Dash, Num, Skeleton } from "@/components/atoms";
import { KebabMenu } from "@/components/molecules";
import { DataTable, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, toCents } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/labels";
import { StatCard } from "@/features/leases/LeaseParts";
import { useLedger } from "@/features/ledger/hooks";
import { balanceText } from "@/features/ledger/balance";
import { BalanceText } from "@/features/ledger/LedgerParts";
import { VoidEntryModal } from "@/features/ledger/VoidEntryModal";
import type { LedgerEntry } from "@/types/ledger";

/** Amount cell: muted with strikethrough when voided. */
function Amount({ entry, className }: { entry: LedgerEntry; className?: string }) {
  return <Num className={cn(entry.voided ? "text-text-muted line-through" : className)}>{formatCurrency(entry.amount)}</Num>;
}

/**
 * The lease ledger, shared by the Rent Roll ledger drawer and the lease drawer's Payments tab:
 * 3 cards (current balance, monthly rent, total paid) and the entries newest first. Void (kebab) only with `canVoid`.
 */
export function LedgerView({ leaseId, canVoid }: { leaseId: string; canVoid: boolean }) {
  const ledger = useLedger(leaseId);
  const [voiding, setVoiding] = useState<LedgerEntry | null>(null);

  // The API sends oldest first; the design shows newest first.
  const rows = useMemo(() => (ledger.data ? [...ledger.data.entries].reverse() : []), [ledger.data]);
  const summary = ledger.data?.summary;
  const balanceCents = summary ? toCents(summary.balance) : 0;

  const columns = useMemo<Column<LedgerEntry>[]>(() => {
    const cols: Column<LedgerEntry>[] = [
      { key: "date", header: "Date", cell: (e) => <span className={cn(e.voided && "text-text-muted")}>{formatDate(e.date)}</span> },
      {
        key: "description",
        header: "Description",
        className: "whitespace-normal py-2",
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
    if (canVoid) {
      cols.push({
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 48,
        cell: (e) =>
          e.voided ? null : (
            <KebabMenu
              label={`Actions for ${e.number}`}
              items={[{ label: e.kind === "CHARGE" ? "Void charge" : "Void payment", icon: <Ban strokeWidth={1.5} />, destructive: true, onSelect: () => setVoiding(e) }]}
            />
          ),
      });
    }
    return cols;
  }, [canVoid]);

  const state = ledger.isError ? "error" : ledger.isPending ? "loading" : rows.length === 0 ? "empty" : "ideal";

  return (
    <>
      {summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Current balance" value={balanceText(summary.balance)} className={cn(balanceCents > 0 ? "text-danger" : "text-success")} />
          {/* formatCurrency(null) is "-" (Dash). */}
          <StatCard label="Monthly rent" value={formatCurrency(summary.monthlyRent)} />
          <StatCard label="Total paid" value={formatCurrency(summary.totalPaid)} />
        </div>
      ) : ledger.isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : null}

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

      {voiding && <VoidEntryModal leaseId={leaseId} entry={voiding} onClose={() => setVoiding(null)} />}
    </>
  );
}
