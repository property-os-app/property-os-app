import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, CurrencyInput, Input, Skeleton } from "@/components/atoms";
import { FormField, InlineError, SegmentedControl, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { centsToAmount, dayInMonth, formatMonth, todayISO, toCents } from "@/lib/format";
import { chargeTypeLabels, labelOptions } from "@/lib/labels";
import { useLease } from "@/features/leases/hooks";
import { primaryTenant } from "@/features/leases/stats";
import { useAddCharge } from "@/features/ledger/hooks";
import type { Lease } from "@/types/lease";
import type { ChargeCreateBody, ChargeType } from "@/types/ledger";

const CHARGE_TYPES = Object.keys(chargeTypeLabels) as [ChargeType, ...ChargeType[]];
const FIELDS = ["type", "description", "amount", "dueDate"] as const;
const MAX_DESCRIPTION = 200;
/** amount: 0.01 to 9,999,999,999.99. */
const MAX_AMOUNT_CENTS = 999_999_999_999;

/** Rules from ../property-os-api/docs/frontend-handoff/rules.md (Charges). */
const schema = z.object({
  type: z.enum(CHARGE_TYPES),
  description: z.string().trim().min(1, "Enter a description.").max(MAX_DESCRIPTION, `Keep it under ${MAX_DESCRIPTION} characters.`),
  amount: z
    .union([z.number(), z.literal("")])
    .refine((v) => v !== "" && toCents(v) > 0, "Enter an amount greater than $0.")
    .refine((v) => v === "" || toCents(v) <= MAX_AMOUNT_CENTS, "The amount can be at most $9,999,999,999.99."),
  // Input type="date" gives "" or "YYYY-MM-DD".
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the due date."),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

/** API money string -> CurrencyInput value ("" when empty or 0). */
function moneyValue(value: string | null): number | "" {
  const cents = toCents(value);
  return cents > 0 ? centsToAmount(cents) : "";
}

/** Description, amount and due date for a type: Rent -> "Monthly Rent - {Month YYYY}", the rent, the month's due date. */
function typeDefaults(type: ChargeType, lease: Lease, month: string): Pick<FormInput, "description" | "amount" | "dueDate"> {
  if (type === "RENT") {
    return {
      description: `Monthly Rent - ${formatMonth(month)}`,
      amount: moneyValue(lease.rent),
      dueDate: (lease.rentDueDay !== null ? dayInMonth(month, lease.rentDueDay) : null) ?? todayISO(),
    };
  }
  if (type === "LATE_FEE") return { description: "Late fee", amount: moneyValue(lease.lateFeeAmount), dueDate: todayISO() };
  return { description: "", amount: "", dueDate: todayISO() };
}

function chargeBody(v: FormOutput, month: string): ChargeCreateBody {
  const body: ChargeCreateBody = { type: v.type, description: v.description, amount: centsToAmount(toCents(v.amount as number)), dueDate: v.dueDate };
  // periodMonth only on RENT; never sent (not even null) for other types.
  if (v.type === "RENT") body.periodMonth = month;
  return body;
}

export interface AddChargeModalProps {
  leaseId: string;
  /** "YYYY-MM": the Rent charge's periodMonth and due date month (Rent Roll: the page month; lease drawer: current UTC month). */
  month: string;
  onClose: () => void;
}

/** "Add charge" modal: Rent, Late fee or Other. Loads the lease (usually cached) for the prefills. Mount it only while open. */
export function AddChargeModal({ leaseId, month, onClose }: AddChargeModalProps) {
  const lease = useLease(leaseId);
  if (lease.data) return <ChargeForm lease={lease.data} month={month} onClose={onClose} />;
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title="Add charge" footer={<Button onClick={onClose}>Cancel</Button>}>
      {lease.isError ? (
        <InlineError title="Couldn't load the lease" description={errorText(lease.error)} onRetry={() => void lease.refetch()} />
      ) : (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
      )}
    </Modal>
  );
}

function ChargeForm({ lease, month, onClose }: { lease: Lease; month: string; onClose: () => void }) {
  const add = useAddCharge();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { type: "RENT", ...typeDefaults("RENT", lease, month) },
    mode: "onTouched",
  });
  const type = useWatch({ control, name: "type" });

  const changeType = (next: ChargeType) => {
    setValue("type", next, { shouldDirty: true });
    const d = typeDefaults(next, lease, month);
    setValue("description", d.description, { shouldDirty: true });
    setValue("amount", d.amount, { shouldDirty: true });
    setValue("dueDate", d.dueDate, { shouldDirty: true });
  };

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      const saved = await add.mutateAsync({ leaseId: lease.id, body: chargeBody(v, month) });
      toast.success(`Charge ${saved.invoiceNumber} added`);
      onClose();
    } catch (err) {
      // 409 "Rent for {month} already exists" belongs next to Type.
      if (err instanceof ApiError && err.status === 409 && err.messages.some((m) => m.startsWith("Rent for"))) {
        setError("type", { type: "server", message: err.messages.join(". ") });
        return;
      }
      setFormErrors(applyServerError(setError, err, FIELDS));
    }
  });

  const tenant = primaryTenant(lease)?.fullName ?? "No tenant";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      title="Add charge"
      description={`${tenant} · Unit ${lease.unit.unitNumber}, ${lease.unit.property.name}`}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="charge-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Adding..." : "Add charge"}
          </Button>
        </>
      }
    >
      <form id="charge-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} />}

        <FormField label="Type" required error={errors.type?.message} help={type === "RENT" ? `For ${formatMonth(month)}` : undefined}>
          <SegmentedControl<ChargeType>
            aria-label="Charge type"
            value={type}
            onChange={changeType}
            segments={labelOptions(chargeTypeLabels).map((o) => ({ value: o.value, label: o.label }))}
            className="w-fit"
          />
        </FormField>
        <FormField label="Description" htmlFor="ch-description" required error={errors.description?.message}>
          <Input id="ch-description" maxLength={MAX_DESCRIPTION} autoComplete="off" {...register("description")} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Amount" htmlFor="ch-amount" required error={errors.amount?.message}>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => <CurrencyInput id="ch-amount" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
          </FormField>
          <FormField label="Due date" htmlFor="ch-due" required error={errors.dueDate?.message}>
            <Input id="ch-due" type="date" {...register("dueDate")} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
