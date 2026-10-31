import { toast } from "@/components/molecules";
import { ConfirmDialog } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useDeleteExpense } from "@/features/expenses/hooks";
import type { Expense } from "@/types/expense";

/** "Delete expense?" for a never-approved expense (allowedActions.delete). The backend's 403 / 409 shows inside. null keeps it closed. */
export function ExpenseDeleteDialog({ expense, onClose, onDeleted }: { expense: Expense | null; onClose: () => void; onDeleted?: () => void }) {
  const del = useDeleteExpense();
  return (
    <ConfirmDialog
      open={expense !== null}
      onOpenChange={(open) => {
        if (!open) {
          del.reset();
          onClose();
        }
      }}
      title="Delete expense?"
      consequence={expense ? `${expense.expenseNumber} (${expense.description}, ${formatCurrency(expense.amount)}) is removed. Only expenses that were never approved can be deleted.` : ""}
      confirmLabel="Delete expense"
      destructive
      onConfirm={() => {
        if (!expense) return;
        del.mutate(expense.id, {
          onSuccess: () => {
            toast.success(`Expense ${expense.expenseNumber} deleted`);
            del.reset();
            onClose();
            onDeleted?.();
          },
        });
      }}
      busy={del.isPending}
      error={del.isError ? errorText(del.error) : null}
    />
  );
}
