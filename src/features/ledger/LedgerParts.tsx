import { Num } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { toCents, type MoneyInput } from "@/lib/format";
import { balanceText } from "@/features/ledger/balance";

/** Balance as a number: danger and bold when owed, success "Credit {amount}" when negative, plain at 0. */
export function BalanceText({ value, className }: { value: MoneyInput; className?: string }) {
  const cents = toCents(value);
  return <Num className={cn(cents > 0 && "font-semibold text-danger", cents < 0 && "text-success", className)}>{balanceText(value)}</Num>;
}
