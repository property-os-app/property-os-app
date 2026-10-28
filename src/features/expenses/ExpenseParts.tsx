import { Badge, Num } from "@/components/atoms";
import { StatusBadge } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { Expense } from "@/types/expense";

/** The approval badge, plus "Voided" for a voided (approved) expense. */
export function ExpenseStatusBadges({ expense }: { expense: Expense }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge domain="approval" status={expense.status} />
      {expense.voided && <Badge tone="neutral">Voided</Badge>}
    </span>
  );
}

/** "$640.00"; muted and struck through when voided (it no longer counts in totals). */
export function ExpenseAmount({ expense, className }: { expense: Expense; className?: string }) {
  return <Num className={cn(expense.voided && "text-text-muted line-through", className)}>{formatCurrency(expense.amount)}</Num>;
}
