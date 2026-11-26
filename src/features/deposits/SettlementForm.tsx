import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, CurrencyInput, Input, Num, Select, Small, Textarea } from "@/components/atoms";
import { FormField } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { centsToAmount, formatCurrency, toCents } from "@/lib/format";
import { labelOptions, paymentMethodLabels, referenceHint } from "@/lib/labels";
import { textLink } from "@/features/shared/linkClass";
import {
  MAX_DEDUCTIONS,
  MAX_NOTES,
  MAX_REASON,
  MAX_REFERENCE,
  assignmentProblem,
  autoRefundCents,
  changeSettlement,
  leftToAssignCents,
  leftToAssignView,
  newDeduction,
  overDepositText,
  refundTheRest,
  type SettlementContext,
  type SettlementErrors,
  type SettlementValues,
} from "@/features/deposits/settlement";
import type { SelectablePaymentMethod } from "@/types/ledger";

export interface SettlementFormProps {
  values: SettlementValues;
  onChange: (next: SettlementValues) => void;
  ctx: SettlementContext;
  /** Money string: what the tenant owes now (the "Apply to unpaid balance" help). */
  openBalance: string;
  /** Security and pet parts, for the summary line. */
  securityDeposit: string | null;
  petDeposit: string | null;
  errors: SettlementErrors;
  disabled?: boolean;
}

const toneText = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;
const toneBox = { success: "border-success/30 bg-success-soft", warning: "border-warning/30 bg-warning-soft", danger: "border-danger/30 bg-danger-soft" } as const;

/**
 * The deposit settlement fields, used by the Deposit card's modal and by End lease: deductions (reason + amount, up to 20),
 * "Apply to unpaid balance" (up to maxApplicable), the refund (amount, then date, method without DEPOSIT and reference, off at
 * $0), settled on and notes, and the live "Left to assign" counter (green at $0.00). Controlled: the parent holds the values,
 * the errors and Save.
 */
export function SettlementForm({ values: v, onChange, ctx, openBalance, securityDeposit, petDeposit, errors, disabled }: SettlementFormProps) {
  const id = useId();
  const set = <K extends keyof SettlementValues>(key: K, value: SettlementValues[K]) => onChange(changeSettlement(v, key, value, ctx.totalHeld));
  const left = leftToAssignCents(v, ctx.totalHeld);
  const counter = leftToAssignView(left);
  const refundOn = v.refundAmount !== "" && toCents(v.refundAmount) > 0;
  const maxCents = toCents(ctx.maxApplicable);
  const owed = toCents(openBalance);
  const overText = overDepositText(v, ctx.totalHeld);
  const problem = assignmentProblem(v, ctx.totalHeld);
  const rest = formatCurrency(centsToAmount(autoRefundCents(v, ctx.totalHeld)));

  const setRow = (key: string, part: Partial<{ reason: string; amount: number | "" }>) => set("deductions", v.deductions.map((d) => (d.key === key ? { ...d, ...part } : d)));

  return (
    <div className="flex flex-col gap-5">
      <Small className="block">
        Deposit held <Num className="font-semibold text-text-primary">{formatCurrency(ctx.totalHeld)}</Num>
        {toCents(petDeposit) > 0 && (
          <>
            {" "}
            (Security <Num>{formatCurrency(securityDeposit ?? "0")}</Num> · Pet <Num>{formatCurrency(petDeposit)}</Num>)
          </>
        )}
        . Split all of it between deductions, the unpaid balance and the refund.
      </Small>

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <legend className="mb-2 p-0 text-small font-semibold text-text-primary">Deductions</legend>
        {v.deductions.length === 0 && <Small>No deductions: nothing is kept for cleaning, damage or keys.</Small>}
        {v.deductions.map((d, i) => {
          const rowErrors = errors.rows?.[d.key];
          return (
            <div key={d.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-2 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-start">
              <FormField label={`Reason ${i + 1}`} htmlFor={`${id}-r-${d.key}`} error={rowErrors?.reason} className="col-span-2 md:col-span-1">
                <Input
                  id={`${id}-r-${d.key}`}
                  value={d.reason}
                  maxLength={MAX_REASON}
                  disabled={disabled}
                  placeholder="e.g. Carpet cleaning"
                  onChange={(e) => setRow(d.key, { reason: e.target.value })}
                />
              </FormField>
              <FormField label="Amount" htmlFor={`${id}-a-${d.key}`} error={rowErrors?.amount}>
                <CurrencyInput id={`${id}-a-${d.key}`} value={d.amount} disabled={disabled} onChange={(amount) => setRow(d.key, { amount })} />
              </FormField>
              <Button
                variant="ghost"
                iconOnly
                icon={<Trash2 size={16} strokeWidth={1.5} />}
                aria-label={`Remove deduction ${i + 1}`}
                disabled={disabled}
                onClick={() => set("deductions", v.deductions.filter((x) => x.key !== d.key))}
                className="mt-6 max-md:h-11 max-md:w-11"
              />
            </div>
          );
        })}
        {errors.deductions && <Small className="text-danger">{errors.deductions}</Small>}
        {overText && <Small className="font-semibold text-danger">{overText}</Small>}
        {v.deductions.length < MAX_DEDUCTIONS && (
          <Button
            size="sm"
            variant="ghost"
            icon={<Plus size={14} strokeWidth={1.5} />}
            disabled={disabled}
            onClick={() => set("deductions", [...v.deductions, newDeduction()])}
            className="self-start max-md:h-11"
          >
            Add deduction
          </Button>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="Apply to unpaid balance"
          htmlFor={`${id}-applied`}
          error={errors.appliedToBalance}
          help={owed > 0 ? `Open balance ${formatCurrency(openBalance)} · up to ${formatCurrency(ctx.maxApplicable)}` : "Nothing is owed, so nothing can be applied."}
          action={
            maxCents > 0 && (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => set("appliedToBalance", centsToAmount(maxCents))}>
                Max
              </Button>
            )
          }
        >
          <CurrencyInput id={`${id}-applied`} value={v.appliedToBalance} disabled={disabled} onChange={(x) => set("appliedToBalance", x)} />
        </FormField>
        <FormField
          label="Refund amount"
          htmlFor={`${id}-refund`}
          error={errors.refundAmount}
          help={v.refundAuto ? "The rest of the deposit, kept up to date. Type to change it." : "What goes back to the tenant."}
          action={
            !v.refundAuto && (
              <button type="button" disabled={disabled} onClick={() => onChange(refundTheRest(v, ctx.totalHeld))} className={cn(textLink, "text-caption")}>
                Refund the rest ({rest})
              </button>
            )
          }
        >
          <CurrencyInput id={`${id}-refund`} value={v.refundAmount} disabled={disabled} onChange={(x) => set("refundAmount", x)} />
        </FormField>

        <FormField label="Refund date" htmlFor={`${id}-rdate`} error={errors.refundDate} help={refundOn ? "Optional, if it isn't sent yet." : "Only with a refund."}>
          <Input id={`${id}-rdate`} type="date" value={refundOn ? v.refundDate : ""} max={ctx.today} disabled={disabled || !refundOn} onChange={(e) => set("refundDate", e.target.value)} />
        </FormField>
        <FormField label="Refund method" htmlFor={`${id}-rmethod`} error={errors.refundMethod}>
          <Select
            id={`${id}-rmethod`}
            value={refundOn ? v.refundMethod : ""}
            disabled={disabled || !refundOn}
            onChange={(e) => set("refundMethod", e.target.value as SelectablePaymentMethod | "")}
          >
            <option value="">Not set</option>
            {labelOptions(paymentMethodLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Refund reference" htmlFor={`${id}-rref`} error={errors.refundReference} help={refundOn ? (referenceHint(v.refundMethod) ?? "Check number, transfer ID... (optional)") : undefined}>
          <Input
            id={`${id}-rref`}
            value={refundOn ? v.refundReference : ""}
            maxLength={MAX_REFERENCE}
            disabled={disabled || !refundOn}
            onChange={(e) => set("refundReference", e.target.value)}
          />
        </FormField>
        <FormField label="Settled on" htmlFor={`${id}-settled`} required error={errors.settledOn}>
          <Input id={`${id}-settled`} type="date" value={v.settledOn} min={ctx.minSettledOn ?? undefined} max={ctx.today} disabled={disabled} onChange={(e) => set("settledOn", e.target.value)} />
        </FormField>
        <FormField label="Notes" htmlFor={`${id}-notes`} error={errors.notes} className="md:col-span-2">
          <Textarea id={`${id}-notes`} rows={2} value={v.notes} maxLength={MAX_NOTES} disabled={disabled} onChange={(e) => set("notes", e.target.value)} />
        </FormField>
      </div>

      <div role="status" aria-live="polite" className={cn("flex flex-wrap items-center justify-between gap-2 rounded-control border px-4 py-3", toneBox[counter.tone])}>
        <Small className="text-text-primary">Left to assign</Small>
        <Num className={cn("font-bold", toneText[counter.tone])}>{counter.text}</Num>
        {problem && <Small className="basis-full text-text-primary">{problem}</Small>}
      </div>
    </div>
  );
}
