import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerError } from "@/lib/forms";
import { centsToAmount, formatCurrency, todayISO, toCents } from "@/lib/format";
import { labelOptions, paymentMethodLabels } from "@/lib/labels";
import { useRecordPayment } from "@/features/ledger/hooks";
import { balanceText } from "@/features/ledger/balance";
import type { PaymentPrefill } from "@/features/ledger/reenter";
import type { PaymentCreateBody, PaymentMethod } from "@/types/ledger";

const METHODS = Object.keys(paymentMethodLabels) as [PaymentMethod, ...PaymentMethod[]];
const FIELDS = ["amount", "method", "paymentDate", "referenceNumber", "notes"] as const;
const MAX_REFERENCE = 100;
const MAX_NOTES = 1000;
const MAX_AMOUNT_CENTS = 999_999_999_999;

/** Rules from ../property-os-api/docs/frontend-handoff/rules.md (Payments). Overpayment is allowed: the amount is not capped at the balance. */
const schema = z.object({
  leaseId: z.string().min(1, "Choose a tenant."),
  amount: z
    .union([z.number(), z.literal("")])
    .refine((v) => v !== "" && toCents(v) > 0, "Enter an amount greater than $0.")
    .refine((v) => v === "" || toCents(v) <= MAX_AMOUNT_CENTS, "The amount can be at most $9,999,999,999.99."),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the payment date."),
  method: z.enum(METHODS),
  referenceNumber: z.string().trim().max(MAX_REFERENCE, `Keep it under ${MAX_REFERENCE} characters.`),
  notes: z.string().trim().max(MAX_NOTES, `Keep the notes under ${MAX_NOTES} characters.`),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

/** One lease the payment can go to. */
export interface PaymentTarget {
  leaseId: string;
  /** "{tenant}, Unit {n}, {property}". */
  label: string;
  unitNumber: string;
  /** Money string; negative = credit. Rent Roll: the row balance; lease page: the ledger summary balance. */
  balance: string;
}

/** Amount prefill: the balance when something is owed, else empty. */
const prefill = (balance: string | undefined): number | "" => {
  const cents = toCents(balance);
  return cents > 0 ? centsToAmount(cents) : "";
};

/** "Leaves $X open" / "Pays the balance in full" / "Leaves a credit of $X", or nothing without an amount. */
function amountNote(balance: string, amount: number | ""): string | undefined {
  if (amount === "" || toCents(amount) <= 0) return undefined;
  const left = toCents(balance) - toCents(amount);
  if (left > 0) return `Leaves ${formatCurrency(centsToAmount(left))} open`;
  if (left === 0) return "Pays the balance in full";
  return `Leaves a credit of ${formatCurrency(centsToAmount(-left))}`;
}

/** "Balance due: $X" or "Credit $X". */
const balanceHelp = (balance: string) => (toCents(balance) < 0 ? balanceText(balance) : `Balance due: ${formatCurrency(balance)}`);

function paymentBody(v: FormOutput): PaymentCreateBody {
  return {
    amount: centsToAmount(toCents(v.amount as number)),
    method: v.method,
    paymentDate: v.paymentDate,
    ...(v.referenceNumber ? { referenceNumber: v.referenceNumber } : {}),
    ...(v.notes ? { notes: v.notes } : {}),
  };
}

export interface RecordPaymentModalProps {
  /** Leases to choose from (Rent Roll: the month's rows). */
  targets: PaymentTarget[];
  /** Preset and read-only tenant (opened from a row or the lease page). */
  presetLeaseId?: string;
  /** Re-enter a voided payment (needs `presetLeaseId`): its values, with the re-entry note, and its number for the title and toast. */
  reentry?: { from: string; values: PaymentPrefill };
  onClose: () => void;
}

/** "Record Payment" modal (the design's layout, without the partial-payment checkbox). Mount it only while open. */
export function RecordPaymentModal({ targets, presetLeaseId, reentry, onClose }: RecordPaymentModalProps) {
  const record = useRecordPayment();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const preset = presetLeaseId ? targets.find((t) => t.leaseId === presetLeaseId) : undefined;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: reentry
      ? { leaseId: presetLeaseId ?? "", ...reentry.values }
      : {
          leaseId: presetLeaseId ?? "",
          amount: prefill(preset?.balance),
          paymentDate: todayISO(),
          method: "ACH",
          referenceNumber: "",
          notes: "",
        },
    mode: "onTouched",
  });

  const leaseId = useWatch({ control, name: "leaseId" });
  const amount = useWatch({ control, name: "amount" });
  const target = targets.find((t) => t.leaseId === leaseId);

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      const saved = await record.mutateAsync({ leaseId: v.leaseId, body: paymentBody(v) });
      toast.success(reentry ? `Re-entered as ${saved.paymentNumber}` : `Payment ${saved.paymentNumber} recorded for Unit ${target?.unitNumber ?? ""}`.trim());
      onClose();
    } catch (err) {
      setFormErrors(applyServerError(setError, err, FIELDS));
    }
  });

  const tenantField = register("leaseId");

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      title={reentry ? `Re-enter payment ${reentry.from}` : "Record Payment"}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Recording..." : reentry ? "Re-enter payment" : "Record Payment"}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} />}

        <FormField label="Tenant" htmlFor="pay-tenant" required error={errors.leaseId?.message} help={target ? balanceHelp(target.balance) : undefined}>
          {preset ? (
            <Input id="pay-tenant" value={preset.label} readOnly disabled />
          ) : (
            <Select
              id="pay-tenant"
              {...tenantField}
              onChange={(e) => {
                void tenantField.onChange(e);
                // A new tenant: prefill their balance.
                setValue("amount", prefill(targets.find((t) => t.leaseId === e.target.value)?.balance), { shouldDirty: true });
              }}
            >
              <option value="">Choose a tenant</option>
              {targets.map((t) => (
                <option key={t.leaseId} value={t.leaseId}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Amount" htmlFor="pay-amount" required error={errors.amount?.message} help={target ? amountNote(target.balance, amount) : undefined}>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => <CurrencyInput id="pay-amount" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
          </FormField>
          <FormField label="Payment date" htmlFor="pay-date" required error={errors.paymentDate?.message}>
            <Input id="pay-date" type="date" {...register("paymentDate")} />
          </FormField>
        </div>
        <FormField label="Method" htmlFor="pay-method" required error={errors.method?.message}>
          <Select id="pay-method" {...register("method")}>
            {labelOptions(paymentMethodLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference" htmlFor="pay-reference" error={errors.referenceNumber?.message}>
          <Input id="pay-reference" maxLength={MAX_REFERENCE} placeholder="Check number or confirmation ID" autoComplete="off" {...register("referenceNumber")} />
        </FormField>
        <FormField label="Notes" htmlFor="pay-notes" error={errors.notes?.message}>
          <Textarea id="pay-notes" maxLength={MAX_NOTES} {...register("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}
