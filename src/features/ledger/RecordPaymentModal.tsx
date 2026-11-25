import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { z } from "zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { Combobox, FormField, InlineError, toast, type ComboboxOption } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError } from "@/lib/api";
import { DOCUMENT_RULE } from "@/lib/files";
import { applyServerError } from "@/lib/forms";
import { centsToAmount, formatCurrency, todayISO, toCents } from "@/lib/format";
import { labelOptions, paymentMethodLabels, referenceHint, unitLabel } from "@/lib/labels";
import { categoryOptions } from "@/features/documents/categories";
import { uploadErrorText, useDocumentCategories } from "@/features/documents/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { ledgerQuery, unclearPayment, useRecordPayment } from "@/features/ledger/hooks";
import { findPayment, receiptCategory, receiptErrorField, type ReceiptValue } from "@/features/ledger/paymentForm";
import { ReceiptField, type ReceiptErrors } from "@/features/ledger/ReceiptField";
import { UnclearPayment, type UnclearState } from "@/features/ledger/UnclearPayment";
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
  /** For the searchable picker: the name, "Unit 2, 746 SPW LLC" under it, and the lease number (searched, not shown). Without them it shows `label`. */
  tenantName?: string;
  detail?: string;
  leaseNumber?: string;
  /** Money string; negative = credit. Rent Roll: the row balance; lease page: the ledger summary balance. */
  balance: string;
}

/** The picker's option for a target: name and detail in the list, the full label in the field once chosen. */
const targetOption = (t: PaymentTarget): ComboboxOption => ({
  value: t.leaseId,
  label: t.tenantName ?? t.label,
  description: t.detail,
  selectedLabel: t.label,
  keywords: t.leaseNumber,
});

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
  /** Shows the lease's ledger after an unclear reply (the modal closes first). Default: goes to the lease page. */
  onOpenLedger?: () => void;
  onClose: () => void;
}

/**
 * "Record Payment" modal, with an optional receipt sent in the same request. Nothing can be changed or closed while sending.
 * When the reply is lost or unclear the payment may have been saved: Save stays locked until the ledger has been reloaded,
 * and the form says whether the payment is in it. Mount it only while open.
 */
export function RecordPaymentModal({ targets, presetLeaseId, reentry, onOpenLedger, onClose }: RecordPaymentModalProps) {
  const record = useRecordPayment();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptValue>({ file: null, category: null });
  const [receiptErrors, setReceiptErrors] = useState<ReceiptErrors>({});
  const categories = useDocumentCategories();
  // The payment sent without a clear answer, and what the reloaded ledger says about it.
  const [unclear, setUnclear] = useState<{ leaseId: string; body: PaymentCreateBody; known: ReadonlySet<string>; state: UnclearState } | null>(null);
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
  const transactionHint = referenceHint(useWatch({ control, name: "method" }));
  const target = targets.find((t) => t.leaseId === leaseId);

  // Never while sending: the answer would be lost. After an unclear reply there is nothing left to discard.
  const confirmClose = () => !isSubmitting && ((!isDirty && !receipt.file) || unclear !== null || window.confirm("Discard changes?"));
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    setReceiptErrors({});
    setUnclear(null);
    const body = paymentBody(v);
    const known = new Set(qc.getQueryData(ledgerQuery(v.leaseId).queryKey)?.entries.map((e) => e.id));
    try {
      const saved = await record.mutateAsync({ leaseId: v.leaseId, body, file: receipt.file, category: receiptCategory(receipt, categoryOptions(categories.data, "payments")) });
      const done = reentry ? `Re-entered as ${saved.paymentNumber}` : `Payment ${saved.paymentNumber} recorded${target ? ` for ${unitLabel(target.unitNumber)}` : ""}`;
      toast.success(saved.document ? `${done} with receipt` : done);
      onClose();
    } catch (err) {
      if (unclearPayment(err)) {
        // Not awaited: the check may take a while (a waking server), and the form can be closed meanwhile.
        void checkLedger({ leaseId: v.leaseId, body, known });
        return;
      }
      if (!(err instanceof ApiError)) return;
      // All or nothing: after a clear "no" nothing was saved. The receipt's messages go under the receipt.
      const rest: string[] = [];
      const onReceipt: ReceiptErrors = {};
      for (const m of err.messages) {
        const field = receipt.file ? receiptErrorField(m, err.status) : null;
        if (field === "file") onReceipt.file = uploadErrorText(new ApiError(err.status, [m]), DOCUMENT_RULE);
        else if (field) onReceipt.category = m;
        else rest.push(m);
      }
      setReceiptErrors(onReceipt);
      if (rest.length > 0 || err.messages.length === 0) setFormErrors(applyServerError(setError, new ApiError(err.status, rest, err.error, err.code), FIELDS));
    }
  });

  /** Reloads the ledger and looks for the payment in it. Until that worked, Save stays locked. */
  const checkLedger = async (sent: { leaseId: string; body: PaymentCreateBody; known: ReadonlySet<string> }) => {
    setUnclear({ ...sent, state: { status: "checking" } });
    try {
      const ledger = await qc.fetchQuery({ ...ledgerQuery(sent.leaseId), staleTime: 0, networkMode: "always" });
      const entry = findPayment(ledger.entries, sent.body, sent.known);
      setUnclear({ ...sent, state: entry ? { status: "found", entry } : { status: "missing" } });
    } catch {
      setUnclear({ ...sent, state: { status: "failed" } });
    }
  };

  const openLedger = () => {
    onClose();
    if (onOpenLedger) onOpenLedger();
    else if (unclear) void navigate(`/leases/${encodeURIComponent(unclear.leaseId)}?tab=ledger`, { state: { from: "rent-roll" } satisfies LeasePageState });
  };

  // The form is locked while sending and after an unclear reply, until the ledger says the payment isn't there.
  const busy = isSubmitting || unclear?.state.status === "checking";
  const locked = busy || (unclear !== null && unclear.state.status !== "missing");
  const saveLabel = reentry ? "Re-enter payment" : "Record Payment";
  const sendButton = (label: string, variant: "primary" | "secondary" = "primary") => (
    <Button type="submit" form="payment-form" variant={variant} disabled={busy} aria-busy={busy || undefined}>
      {busy ? (unclear ? "Checking the ledger..." : "Recording...") : label}
    </Button>
  );
  const openLedgerButton = (variant: "primary" | "secondary") => (
    <Button variant={variant} disabled={isSubmitting} onClick={openLedger}>
      Open ledger
    </Button>
  );

  const options = useMemo(() => targets.map(targetOption), [targets]);

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
          {!unclear || unclear.state.status === "checking" ? (
            sendButton(saveLabel)
          ) : unclear.state.status === "failed" ? (
            <Button variant="primary" onClick={() => void checkLedger(unclear)}>
              Check again
            </Button>
          ) : unclear.state.status === "found" ? (
            <>
              {sendButton("Record again anyway", "secondary")}
              {openLedgerButton("primary")}
            </>
          ) : (
            <>
              {openLedgerButton("secondary")}
              {sendButton("Try again")}
            </>
          )}
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} />}
        {unclear && <UnclearPayment state={unclear.state} />}

                <fieldset disabled={locked} className="contents">
          <Controller
            control={control}
            name="leaseId"
            // The FormField is inside, so its error / help id reaches the field itself.
            render={({ field }) => (
              <FormField label="Tenant" htmlFor="pay-tenant" required error={errors.leaseId?.message} help={target ? balanceHelp(target.balance) : undefined}>
                {preset ? (
                  <Input id="pay-tenant" value={preset.label} readOnly disabled />
                ) : (
                  <Combobox
                    id="pay-tenant"
                    ref={field.ref}
                    name={field.name}
                    options={options}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(next) => {
                      field.onChange(next);
                      // A new tenant: prefill their balance. A prefilled amount is checked at once, so an earlier "enter an amount" error goes.
                      const amount = prefill(targets.find((t) => t.leaseId === next)?.balance);
                      setValue("amount", amount, { shouldDirty: true, shouldValidate: amount !== "" });
                    }}
                    listLabel="Tenant"
                    placeholder="Choose a tenant"
                  />
                )}
              </FormField>
            )}
          />
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
          <FormField label="Reference" htmlFor="pay-reference" error={errors.referenceNumber?.message} help={transactionHint}>
            <Input id="pay-reference" maxLength={MAX_REFERENCE} placeholder={transactionHint ? undefined : "Check number or confirmation ID"} autoComplete="off" {...register("referenceNumber")} />
          </FormField>
          <FormField label="Notes" htmlFor="pay-notes" error={errors.notes?.message}>
            <Textarea id="pay-notes" maxLength={MAX_NOTES} {...register("notes")} />
          </FormField>
          <ReceiptField value={receipt} onChange={setReceipt} errors={receiptErrors} onErrors={setReceiptErrors} disabled={locked} />
        </fieldset>
      </form>
    </Modal>
  );
}
