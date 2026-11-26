import { Caption, Num } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { toCents, type MoneyInput } from "@/lib/format";
import { balanceText } from "@/features/ledger/balance";
import { allocationParts, allocationText } from "@/features/ledger/cards";
import { textLink } from "@/features/shared/linkClass";
import type { LedgerCard, LedgerPaymentAllocation } from "@/types/ledger";

/**
 * Balance as a number: bold when owed (danger only when `overdue`: a balance above $0 isn't late by itself, rent is billed
 * up to 28 days early), success "Credit {amount}" when negative, plain at 0. `caption` ("Due Nov 1") goes under it, right-aligned.
 */
export function BalanceText({ value, overdue, caption, className }: { value: MoneyInput; overdue?: boolean; caption?: string | null; className?: string }) {
  const cents = toCents(value);
  const amount = <Num className={cn(cents > 0 && "font-semibold", cents > 0 && overdue && "text-danger", cents < 0 && "text-success", className)}>{balanceText(value)}</Num>;
  if (!caption) return amount;
  return (
    <span className="flex flex-col items-end">
      {amount}
      <Caption className="whitespace-nowrap">{caption}</Caption>
    </span>
  );
}

/**
 * What a payment paid (`paymentAllocations`): "Paid: Oct rent $600.00, Nov rent $600.00 + $50.00 credit"; "Voided: paid
 * nothing" for a voided payment. With `onShowCard` each charge is a link to its card in "By month".
 */
export function PaidLine({ allocation, cards, onShowCard }: { allocation: LedgerPaymentAllocation; cards: LedgerCard[]; onShowCard?: (chargeId: string) => void }) {
  const parts = allocationParts(allocation, cards);
  const charges = parts.filter((p) => p.chargeId !== null);
  if (!onShowCard || charges.length === 0) return <Caption className="block break-words">{allocationText(allocation, cards)}</Caption>;
  const credit = parts.find((p) => p.chargeId === null);
  return (
    <Caption className="pointer-events-auto relative block break-words">
      Paid:{" "}
      {charges.map((p, i) => (
        <span key={p.chargeId}>
          {i > 0 && ", "}
          <button type="button" onClick={() => onShowCard(p.chargeId!)} className={cn(textLink, "text-caption")} title="Show this charge in By month">
            {p.text}
          </button>
        </span>
      ))}
      {credit && ` ${credit.text}`}
    </Caption>
  );
}
