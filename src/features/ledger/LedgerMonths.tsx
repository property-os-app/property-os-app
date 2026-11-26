import { useEffect, useId, useMemo, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Badge, Caption, H3, Num, Overline, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, StatusBadge } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatMonth, toCents } from "@/lib/format";
import { chargeTypeLabels, paymentMethodLabel } from "@/lib/labels";
import { creditAmount, groupCardsByMonth, type CardMonth } from "@/features/ledger/cards";
import { cardAnchor } from "@/features/ledger/ledgerParam";
import { textLink } from "@/features/shared/linkClass";
import type { LedgerCard, LedgerResponse } from "@/types/ledger";

export interface LedgerMonthsProps {
  ledger: LedgerResponse | undefined;
  state: "loading" | "error" | "empty" | "ideal";
  empty: { title: string; description: string };
  error: { title: string; description?: string; onRetry: () => void };
  /** The kebab of a charge (Void / Re-enter, the same as in All entries), or null. */
  actionsFor: (chargeId: string) => ReactNode;
  /** A payment number was clicked: show it in All entries. */
  onShowPayment: (paymentId: string) => void;
  /** The charge to scroll to and highlight (?card=). */
  focusCard: string | null;
  /** "From deposit settlement" next to a DEPOSIT payment: opens the Deposit card. */
  onOpenDeposit?: () => void;
}

/**
 * The charge row's grid. Narrow groups (phones, under 48rem): stacked areas, "number and badges / description / Amount Paid
 * Remaining". From 48rem (a container query on the month group): one line with fixed columns shared by every row and the
 * column header, so the figures line up like a spreadsheet.
 */
const ROW_GRID = cn(
  "grid gap-x-3 gap-y-2",
  "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] [grid-template-areas:'id_id_id_menu'_'desc_desc_desc_desc'_'amt_paid_rem_rem']",
  "@3xl:grid-cols-[9.5rem_minmax(0,1fr)_6rem_6rem_6rem_5.75rem_2.5rem] @3xl:items-center @3xl:[grid-template-areas:'id_desc_amt_paid_rem_st_menu']",
);
/** Left padding of the line under a row (payments), so on desktop it starts under the description column. */
const UNDER_ROW = "@3xl:pl-[calc(9.5rem+0.75rem)]";

/**
 * Ledger tab, "By month": one bordered group per month (newest first) with the month and its "Charged · Paid · Remaining"
 * (voided charges don't count) in its header, then one full-width row per charge in the API order (rent, late fee, other
 * charges of that month): invoice number and type, description and due date, Amount, Paid, Remaining (red when overdue),
 * status and the kebab, with the payments applied in a line under it. VOID rows are muted and struck through with their
 * reason. A credit (`summary.credit`) shows on top.
 */
export function LedgerMonths({ ledger, state, empty, error, actionsFor, onShowPayment, focusCard, onOpenDeposit }: LedgerMonthsProps) {
  const months = useMemo(() => groupCardsByMonth(ledger?.cards ?? []), [ledger]);
  const credit = creditAmount(ledger?.summary);

  // Scroll to the charge asked for once it is on screen.
  const ready = state === "ideal";
  useEffect(() => {
    if (ready && focusCard) document.getElementById(cardAnchor(focusCard))?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [ready, focusCard]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-14" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (state === "error") return <InlineError title={error.title} description={error.description} onRetry={error.onRetry} />;
  if (state === "empty" || months.length === 0) {
    return (
      <Card padding="none">
        <EmptyState title={empty.title} description={empty.description} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {credit && (
        <div className="flex items-start gap-2 rounded-control border border-info/30 bg-info-soft p-3 text-small text-text-primary">
          <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-info" aria-hidden />
          <span>
            <span className="font-semibold">Credit {formatCurrency(credit)}</span>: paid ahead. It pays the next charge automatically.
          </span>
        </div>
      )}
      {months.map((m) => (
        <MonthGroup key={m.month} month={m} actionsFor={actionsFor} onShowPayment={onShowPayment} focusCard={focusCard} onOpenDeposit={onOpenDeposit} />
      ))}
    </div>
  );
}

/** One month: a bordered group (a size container) with its header and the charge rows. */
function MonthGroup({
  month,
  actionsFor,
  onShowPayment,
  focusCard,
  onOpenDeposit,
}: {
  month: CardMonth;
  actionsFor: (chargeId: string) => ReactNode;
  onShowPayment: (id: string) => void;
  focusCard: string | null;
  onOpenDeposit?: () => void;
}) {
  const titleId = useId();
  return (
    // No overflow-hidden: the ⋮ menus open past the group's edge.
    <section aria-labelledby={titleId} className="@container min-w-0 rounded-card border border-border-subtle bg-surface-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-4 @3xl:px-5">
        <H3 id={titleId}>{formatMonth(month.month)}</H3>
        <Small className="tabular">
          Charged {formatCurrency(month.charged)} · Paid {formatCurrency(month.paid)} · Remaining{" "}
          <span className={cn(toCents(month.remaining) > 0 && "font-semibold text-text-primary")}>{formatCurrency(month.remaining)}</span>
        </Small>
      </div>
      {/* Column names, desktop only (phones label each figure). */}
      <div aria-hidden className={cn(ROW_GRID, "hidden border-t border-border-subtle bg-surface-2 px-5 py-2 @3xl:grid")}>
        <Overline className="[grid-area:id]">Invoice</Overline>
        <Overline className="[grid-area:desc]">Description</Overline>
        <Overline className="text-right [grid-area:amt]">Amount</Overline>
        <Overline className="text-right [grid-area:paid]">Paid</Overline>
        <Overline className="text-right [grid-area:rem]">Remaining</Overline>
        <Overline className="[grid-area:st]">Status</Overline>
      </div>
      <ul className="m-0 list-none divide-y divide-border-subtle border-t border-border-subtle p-0">
        {month.cards.map((c) => (
          <ChargeRow key={c.chargeId} card={c} actions={actionsFor(c.chargeId)} onShowPayment={onShowPayment} focused={c.chargeId === focusCard} onOpenDeposit={onOpenDeposit} />
        ))}
      </ul>
    </section>
  );
}

/** One charge as a row, the payments applied to it in a subtle line under it. VOID: muted and struck through, with its reason. */
function ChargeRow({
  card,
  actions,
  onShowPayment,
  focused,
  onOpenDeposit,
}: {
  card: LedgerCard;
  actions: ReactNode;
  onShowPayment: (id: string) => void;
  focused: boolean;
  onOpenDeposit?: () => void;
}) {
  const voided = card.status === "VOID";
  const strike = voided ? "text-text-muted line-through" : undefined;
  return (
    <li
      id={cardAnchor(card.chargeId)}
      aria-current={focused || undefined}
      className={cn(
        "flex scroll-mt-24 flex-col gap-2 px-4 py-3 last:rounded-b-card @3xl:px-5",
        voided && "bg-surface-2",
        focused && "bg-info-soft ring-2 ring-info ring-inset",
      )}
    >
      <div className={ROW_GRID}>
        <div className="flex min-w-0 flex-wrap items-center gap-2 [grid-area:id]">
          <span className={cn("font-mono text-small break-all text-text-secondary", voided && "line-through")}>{card.invoiceNumber}</span>
          <Badge tone="neutral" dot={false}>
            {chargeTypeLabels[card.type]}
          </Badge>
          {/* Phones: the status sits with the number (its desktop column is hidden). */}
          <span className="@3xl:hidden">
            <StatusBadge domain="rent" status={card.status} />
          </span>
        </div>
        <div className="flex min-w-0 flex-col [grid-area:desc]">
          <span className={cn("font-semibold break-words", voided ? "text-text-muted line-through" : "text-text-primary")}>{card.description}</span>
          <Caption>Due {formatDate(card.dueDate)}</Caption>
        </div>
        <Figure area="amt" label="Amount" value={card.amount} className={strike} />
        <Figure area="paid" label="Paid" value={card.paid} className={strike ?? (toCents(card.paid) > 0 ? "text-success" : undefined)} />
        <Figure area="rem" label="Remaining" value={card.remaining} className={strike ?? (card.status === "OVERDUE" ? "text-danger" : undefined)} />
        <div className="hidden [grid-area:st] @3xl:block">
          <StatusBadge domain="rent" status={card.status} />
        </div>
        <div className="flex justify-end [grid-area:menu]">{actions}</div>
      </div>

      <div className={cn("min-w-0 text-small", UNDER_ROW)}>
        {voided ? (
          <Caption className="break-words">Void{card.voidReason ? `: ${card.voidReason}` : ""}</Caption>
        ) : card.payments.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {card.payments.map((p) => (
              <li key={p.paymentId} className="text-text-secondary">
                <span className="text-caption">Paid by </span>
                <button type="button" onClick={() => onShowPayment(p.paymentId)} className={cn(textLink, "font-mono")} aria-label={`Show payment ${p.paymentNumber} in All entries`}>
                  {p.paymentNumber}
                </button>
                {` · ${formatDate(p.date)} · ${paymentMethodLabel(p.method)} · `}
                <Num className="text-text-primary">{formatCurrency(p.appliedAmount)}</Num>
                {p.method === "DEPOSIT" && onOpenDeposit && (
                  <>
                    {" · "}
                    <button type="button" onClick={onOpenDeposit} className={cn(textLink, "text-caption")}>
                      From deposit settlement
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Caption>No payment applied yet.</Caption>
        )}
      </div>
    </li>
  );
}

/** A money figure; its label shows on phones only (desktop has the column header). Right-aligned in the desktop columns. */
function Figure({ area, label, value, className }: { area: "amt" | "paid" | "rem"; label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0 @3xl:text-right", area === "amt" ? "[grid-area:amt]" : area === "paid" ? "[grid-area:paid]" : "[grid-area:rem]")}>
      <span className="block text-caption text-text-secondary @3xl:sr-only">{label}</span>
      <Num className={cn("font-bold break-words text-text-primary", className)}>{formatCurrency(value)}</Num>
    </div>
  );
}
