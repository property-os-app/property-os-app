import { useState } from "react";
import { Body, Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatCurrency, toCents } from "@/lib/format";
import { labelOptions, paymentMethodLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { RatingInput } from "@/features/shared/Rating";
import { resolveBody, resolveSchema, type ResolveInput } from "@/features/maintenance/form";
import { useTicketAction } from "@/features/maintenance/hooks";
import { ticketNo } from "@/features/maintenance/ticketText";
import type { PaymentMethod } from "@/types/ledger";
import type { MaintenanceTicket } from "@/types/maintenance";

type Field = keyof ResolveInput;
const FIELDS: Field[] = ["resolutionNote", "actualCost", "paymentMethod", "reference", "vendorRating"];

const empty: ResolveInput = { resolutionNote: "", actualCost: "", paymentMethod: "", reference: "", vendorRating: null };

/**
 * Resolve a ticket (POST /resolve): note; actual cost (only with expenses.record, since a cost above $0 records a Repairs
 * expense dated today: approved for the Owner, pending approval for a manager) with payment method and reference once
 * there is a cost; vendor rating 1–5 only when the ticket has a vendor. Errors under their field or at the top.
 * Mount it only while open.
 */
/** `onSaved`: called after a successful resolve, before `onClose`. */
export function ResolveModal({ ticket, onSaved, onClose }: { ticket: MaintenanceTicket; onSaved?: (t: MaintenanceTicket) => void; onClose: () => void }) {
  const { me } = useAuth();
  const isOwner = me?.role === "OWNER";
  const canRecordCost = me ? can(me, "expense.record") : false;
  const hasVendor = ticket.vendor !== null;
  const action = useTicketAction();
  const [values, setValues] = useState<ResolveInput>(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const busy = action.isPending;
  const hasCost = values.actualCost !== "" && toCents(values.actualCost) > 0;

  const set = <K extends Field>(key: K, value: ResolveInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = () => {
    setError(null);
    const parsed = resolveSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    const body = resolveBody(values, { canRecordCost, hasVendor });
    action.mutate(
      { id: ticket.id, action: "resolve", body },
      {
        onSuccess: (saved) => {
          const added = body.actualCost !== undefined ? saved.expenses.at(-1) : undefined;
          toast.success(
            added
              ? `${ticketNo(saved)} resolved. Expense ${added.expenseNumber} ${added.status === "APPROVED" ? "recorded" : "sent for approval"}`
              : `${ticketNo(saved)} resolved`,
          );
          onSaved?.(saved);
          onClose();
        },
        onError: (err) => {
          if (!(err instanceof ApiError)) return setError(errorText(err));
          const byField: Partial<Record<Field, string>> = {};
          const general: string[] = [];
          for (const m of err.messages) {
            const field = FIELDS.find((f) => m.startsWith(`${f} `));
            if (field) byField[field] = byField[field] ? `${byField[field]}. ${m}` : m;
            else general.push(m);
          }
          setErrors(byField);
          if (general.length > 0 || Object.keys(byField).length === 0) setError(general.length > 0 ? general.join(". ") : errorText(err));
        },
      },
    );
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={`Resolve ${ticketNo(ticket)}`}
      description={ticket.title}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} aria-busy={busy || undefined} onClick={submit}>
            {busy ? "Resolving..." : "Resolve ticket"}
          </Button>
        </>
      }
    >
      {error && <InlineError title={error} />}
      <FormField label="Resolution note" htmlFor="resolve-note" error={errors.resolutionNote} help="What was done. Optional.">
        <Textarea
          id="resolve-note"
          autoFocus
          maxLength={2000}
          value={values.resolutionNote}
          disabled={busy}
          onChange={(e) => set("resolutionNote", e.target.value)}
        />
      </FormField>

      {canRecordCost && (
        <>
          <FormField
            label="Actual cost"
            htmlFor="resolve-cost"
            error={errors.actualCost}
            help={
              hasCost
                ? isOwner
                  ? `Records a Repairs expense of ${formatCurrency(values.actualCost)} dated today, approved.`
                  : "Records a Repairs expense dated today. It goes to the owner for approval."
                : "Optional. A cost records a Repairs expense dated today."
            }
          >
            <CurrencyInput id="resolve-cost" value={values.actualCost} disabled={busy} onChange={(v) => set("actualCost", v)} />
          </FormField>
          {hasCost && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Payment method" htmlFor="resolve-method" error={errors.paymentMethod}>
                <Select
                  id="resolve-method"
                  value={values.paymentMethod}
                  disabled={busy}
                  onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod | "")}
                >
                  <option value="">Not set</option>
                  {labelOptions(paymentMethodLabels).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Reference" htmlFor="resolve-reference" error={errors.reference} help="Vendor invoice or other number.">
                <Input
                  id="resolve-reference"
                  autoComplete="off"
                  maxLength={100}
                  value={values.reference}
                  disabled={busy}
                  onChange={(e) => set("reference", e.target.value)}
                />
              </FormField>
            </div>
          )}
        </>
      )}

      {hasVendor ? (
        <FormField
          label={<span id="resolve-rating-label">Rate {ticket.vendor!.name}</span>}
          error={errors.vendorRating}
          help="Optional. Shown as the vendor's average rating."
          action={
            values.vendorRating !== null ? (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => set("vendorRating", null)}>
                Clear
              </Button>
            ) : undefined
          }
        >
          <RatingInput aria-labelledby="resolve-rating-label" value={values.vendorRating} disabled={busy} onChange={(n) => set("vendorRating", n)} />
        </FormField>
      ) : (
        <Body className="m-0 text-text-secondary">No vendor on this ticket, so there's nothing to rate.</Body>
      )}
    </Modal>
  );
}
