import { useState, type ReactNode } from "react";
import { Receipt } from "lucide-react";
import { Button, Caption, Dash, Display, H3, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, KeyValueList, toast } from "@/components/molecules";
import { Drawer } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate, formatTimestampDate } from "@/lib/format";
import { expenseTypeLabels, paymentMethodLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { ExpenseDeleteDialog } from "@/features/expenses/ExpenseDeleteDialog";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import { ExpenseStatusBadges } from "@/features/expenses/ExpenseParts";
import { isAutoApproved, propertyText } from "@/features/expenses/expenseText";
import { useCategoryLabel, useExpense, useExpenseAction } from "@/features/expenses/hooks";
import { ReasonModal } from "@/features/expenses/ReasonModal";
import type { Expense } from "@/types/expense";

const orDash = (value: string | null | undefined) => (value ? value : <Dash />);

export interface ExpenseDrawerProps {
  id: string;
  /** The list row, shown until GET /expenses/:id answers. */
  placeholder?: Expense;
  onClose: () => void;
}

/**
 * One expense (lg drawer): amount, status notes, details and a short history (recorded, approved / rejected with the
 * reason, voided with the reason). Footer buttons come only from allowedActions: Delete, Void (reason), Reject (reason),
 * Approve, Edit. A 409 (changed by someone else) shows its message and refetches. Mount it only while open.
 */
export function ExpenseDrawer({ id, placeholder, onClose }: ExpenseDrawerProps) {
  const { me } = useAuth();
  const detail = useExpense(id, placeholder);
  const categoryLabel = useCategoryLabel();
  const action = useExpenseAction();
  const [editing, setEditing] = useState(false);
  const [reasonFor, setReasonFor] = useState<"reject" | "void" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  const e = detail.data;
  const can = e && !notFound ? e.allowedActions : null;

  const approve = () => {
    if (!e) return;
    action.mutate(
      { id: e.id, action: "approve" },
      { onSuccess: (saved) => toast.success(`Expense ${saved.expenseNumber} approved`), onError: (err) => toast.error(errorText(err)) },
    );
  };

  const footer =
    can && (can.delete || can.void || can.reject || can.approve || can.edit) ? (
      <>
        {can.delete && (
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            Delete
          </Button>
        )}
        {can.void && (
          <Button variant="ghost" className="text-danger" onClick={() => setReasonFor("void")}>
            Void
          </Button>
        )}
        {can.edit && <Button onClick={() => setEditing(true)}>Edit</Button>}
        {can.reject && <Button onClick={() => setReasonFor("reject")}>Reject</Button>}
        {can.approve && (
          <Button variant="primary" onClick={approve} disabled={action.isPending} aria-busy={action.isPending || undefined}>
            {action.isPending && action.variables?.action === "approve" ? "Approving..." : "Approve"}
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => !open && onClose()}
        size="lg"
        title={e ? e.description : "Expense"}
        description={e ? `${e.expenseNumber} · ${formatDate(e.date)}` : undefined}
        status={e && !notFound ? <ExpenseStatusBadges expense={e} /> : undefined}
        footer={footer}
      >
        {notFound ? (
          <Card padding="none">
            <EmptyState icon={<Receipt strokeWidth={1.5} />} title="Expense not found" description="It was deleted, or it isn't on one of your properties." />
          </Card>
        ) : !e ? (
          detail.isError ? (
            <InlineError title="Couldn't load the expense" description={errorText(detail.error)} onRetry={() => void detail.refetch()} />
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-40" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-5" />
              ))}
            </div>
          )
        ) : (
          <Body expense={e} meId={me?.id} categoryLabel={categoryLabel(e.category)} />
        )}
      </Drawer>

      {editing && e && <ExpenseFormModal expense={e} onClose={() => setEditing(false)} />}
      {reasonFor && e && (
        <ReasonModal
          title={reasonFor === "void" ? `Void expense ${e.expenseNumber}` : `Reject expense ${e.expenseNumber}`}
          description={`${formatCurrency(e.amount)} · ${formatDate(e.date)}`}
          intro={
            reasonFor === "void"
              ? "A voided expense stays on record but stops counting in totals. Voiding is permanent and it can't be edited afterwards."
              : `${e.createdBy.name} sees the reason and can edit and resubmit it, or delete it.`
          }
          confirmLabel={reasonFor === "void" ? "Void expense" : "Reject expense"}
          busyLabel={reasonFor === "void" ? "Voiding..." : "Rejecting..."}
          danger={reasonFor === "void"}
          onConfirm={async (reason) => {
            const saved = await action.mutateAsync({ id: e.id, action: reasonFor, reason });
            toast.success(`Expense ${saved.expenseNumber} ${reasonFor === "void" ? "voided" : "rejected"}`);
          }}
          onClose={() => setReasonFor(null)}
        />
      )}
      <ExpenseDeleteDialog expense={deleting && e ? e : null} onClose={() => setDeleting(false)} onDeleted={onClose} />
    </>
  );
}

function Note({ tone, children }: { tone: "warning" | "danger" | "neutral"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-card border border-border-subtle p-3 text-small text-text-primary",
        tone === "warning" && "bg-warning-soft",
        tone === "danger" && "bg-danger-soft",
        tone === "neutral" && "bg-surface-2",
      )}
    >
      {children}
    </div>
  );
}

function Body({ expense: e, meId, categoryLabel }: { expense: Expense; meId?: string; categoryLabel: string }) {
  const mine = e.createdById === meId;
  const history: { label: string; when: string | null; reason?: string | null }[] = [{ label: `Recorded by ${e.createdBy.name}`, when: e.createdAt }];
  if (e.status === "APPROVED" && isAutoApproved(e)) history.push({ label: "Approved automatically (Owner)", when: e.approvedAt });
  else if (e.approvedBy) history.push({ label: `Approved by ${e.approvedBy.name}`, when: e.approvedAt });
  if (e.rejectedBy) history.push({ label: `Rejected by ${e.rejectedBy.name}`, when: e.rejectedAt, reason: e.rejectionReason });
  if (e.voidedBy) history.push({ label: `Voided by ${e.voidedBy.name}`, when: e.voidedAt, reason: e.voidReason });
  if (e.status === "PENDING_APPROVAL") history.push({ label: "Waiting for approval", when: null });

  return (
    <>
      <div className="flex flex-col gap-1">
        <Display className={cn(e.voided && "text-text-muted line-through")}>{formatCurrency(e.amount)}</Display>
        <Small>
          {categoryLabel} · {expenseTypeLabels[e.type]}
        </Small>
      </div>

      {e.status === "PENDING_APPROVAL" && mine && !e.allowedActions.approve && (
        <Note tone="warning">
          <span className="font-semibold">Pending approval – waiting for the owner</span>
          <span className="text-text-secondary">It counts in totals once approved. You can still edit or delete it.</span>
        </Note>
      )}
      {e.status === "REJECTED" && (
        <Note tone="danger">
          <span className="font-semibold">Rejected{e.rejectedBy ? ` by ${e.rejectedBy.name}` : ""}</span>
          {e.rejectionReason && <span>Reason: {e.rejectionReason}</span>}
          {e.allowedActions.edit && mine && <span className="text-text-secondary">Edit and save it to send it for approval again, or delete it.</span>}
        </Note>
      )}
      {e.voided && (
        <Note tone="neutral">
          <span className="font-semibold">Voided: no longer counts in totals</span>
          {e.voidReason && <span>Reason: {e.voidReason}</span>}
        </Note>
      )}

      <div className="flex flex-col gap-3">
        <H3>Details</H3>
        <KeyValueList
          labelWidth={150}
          items={[
            { label: "Date", value: formatDate(e.date) },
            { label: "Category", value: categoryLabel },
            { label: "Type", value: expenseTypeLabels[e.type] },
            { label: "Property", value: propertyText(e) },
            { label: "Unit", value: e.unit ? `Unit ${e.unit.unitNumber}` : <Dash /> },
            { label: "Vendor", value: orDash(e.vendor?.name) },
            { label: "Payment method", value: e.paymentMethod ? paymentMethodLabels[e.paymentMethod] : <Dash /> },
            { label: "Reference", value: orDash(e.reference) },
            { label: "Notes", value: e.notes ? <span className="whitespace-pre-line">{e.notes}</span> : <Dash /> },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <H3>History</H3>
        <ol className="m-0 flex list-none flex-col gap-3 border-l border-border-subtle p-0 pl-4">
          {history.map((h) => (
            <li key={h.label} className="flex flex-col gap-0.5">
              <Small className="font-semibold text-text-primary">{h.label}</Small>
              {h.when && <Caption>{formatTimestampDate(h.when)}</Caption>}
              {h.reason && <Small>Reason: {h.reason}</Small>}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
