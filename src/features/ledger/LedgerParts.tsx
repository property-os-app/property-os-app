import { Caption, Num } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { toCents, type MoneyInput } from "@/lib/format";
import { balanceText } from "@/features/ledger/balance";

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
