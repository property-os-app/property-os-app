import { Link } from "react-router";
import { Badge, Num } from "@/components/atoms";
import { StatusBadge } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { textLink } from "@/features/shared/linkClass";
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

/**
 * "Ticket #1025": a link to the maintenance ticket whose resolve recorded this expense (/maintenance?ticket=…, where the
 * ticket drawer opens). Clicks and keys stop here, so it never opens the row or card it sits in. Nothing for other expenses.
 */
export function ExpenseTicketLink({ expense, className }: { expense: Expense; className?: string }) {
  const t = expense.maintenanceTicket;
  if (!t) return null;
  return (
    <Link
      to={`/maintenance?ticket=${encodeURIComponent(t.id)}`}
      title={t.title}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(textLink, "pointer-events-auto whitespace-nowrap", className)}
    >
      Ticket #{t.ticketNumber}
    </Link>
  );
}
