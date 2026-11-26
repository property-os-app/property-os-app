import { ArrowRight } from "lucide-react";
import { Caption, Num, Small } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { toCents } from "@/lib/format";
import { balanceText } from "@/features/ledger/balance";
import { previewRows } from "@/features/deposits/endPreview";
import type { EndPreviewCharge } from "@/types/deposit";

/** A preview's charges: month and invoice, description, amount, and "paid $X → becomes credit" when part of it was paid. */
export function PreviewList({ charges, muted }: { charges: EndPreviewCharge[]; muted?: boolean }) {
  return (
    <ul className="m-0 list-none divide-y divide-border-subtle rounded-control border border-border-subtle p-0">
      {previewRows(charges).map((r) => (
        <li key={r.chargeId} className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className={cn("font-semibold break-words", muted ? "text-text-secondary" : "text-text-primary")}>{r.month}</span>
            <Caption className="break-words">
              <span className="font-mono">{r.invoiceNumber}</span> · {r.description}
            </Caption>
            {r.paidNote && <Caption className="font-semibold text-info">{r.paidNote}</Caption>}
          </div>
          <Num className="shrink-0 font-bold text-text-primary">{r.amount}</Num>
        </li>
      ))}
    </ul>
  );
}

/** "Balance now $8,600.00 → $50.00" (a credit in green). `after` null hides the arrow. */
export function BalanceLine({ now, after }: { now: string; after: string | null }) {
  const tone = (v: string) => (toCents(v) < 0 ? "text-success" : toCents(v) > 0 ? "text-text-primary" : "text-text-secondary");
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-surface-2 px-3 py-2">
      <Small>Balance now</Small>
      <Num className={cn("font-bold", tone(now))}>{balanceText(now)}</Num>
      {after !== null && after !== now && (
        <>
          <ArrowRight size={14} strokeWidth={1.5} className="text-text-muted" aria-label="becomes" />
          <Small>after</Small>
          <Num className={cn("font-bold", tone(after))}>{balanceText(after)}</Num>
        </>
      )}
    </div>
  );
}
