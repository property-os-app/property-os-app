import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerErrorBy } from "@/lib/forms";
import { expenseTypeLabels, labelOptions, paymentMethodLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { createExpenseBody, expenseChanges, expenseDefaults, expenseErrorField, expenseSchema, PORTFOLIO, type ExpenseFormInput, type ExpenseFormOutput } from "@/features/expenses/form";
import { useCreateExpense, useExpenseCategories, useUpdateExpense } from "@/features/expenses/hooks";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { useUnits } from "@/features/units/hooks";
import { useVendors } from "@/features/vendors/hooks";
import type { Expense } from "@/types/expense";

export interface ExpenseFormModalProps {
  /** Edit this expense (only when its allowedActions.edit); without it the modal records a new one. */
  expense?: Expense;
  onSaved?: (expense: Expense) => void;
  onClose: () => void;
}

/**
 * Add / edit expense. Type follows the category's defaultType until the user picks one; the unit list shows only the chosen
 * property's units and clears when the property changes; vendors are active ones (plus the expense's own, even archived).
 * "Portfolio-wide (no single property)" is Owner only. A manager saving a REJECTED expense resubmits it.
 * Backend 400 / 403 / 404 / 409 messages go under their field or at the top. Mount it only while open.
 */
export function ExpenseFormModal({ expense, onSaved, onClose }: ExpenseFormModalProps) {
  const { me } = useAuth();
  const isOwner = me?.role === "OWNER";
  const { propertyId: scope } = useScope();
  const categories = useExpenseCategories();
  const properties = useProperties();
  const units = useUnits();
  const vendors = useVendors();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const defaultTypeOf = (key: string) => categories.data?.find((c) => c.key === key)?.defaultType;
  // Picked by hand: keep the type when the category changes. On edit it is decided on the first category change (once the
  // categories are loaded): a saved type that differs from its category's default was picked by hand.
  const [typeTouched, setTypeTouched] = useState<boolean | null>(expense ? null : false);
  const resubmits = !isOwner && expense?.status === "REJECTED";

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseDefaults(expense, scope),
    mode: "onTouched",
  });

  const propertyId = useWatch({ control, name: "propertyId" });
  const unitOptions = useMemo(() => (units.data ?? []).filter((u) => u.propertyId === propertyId), [units.data, propertyId]);
  const vendorOptions = useMemo(
    () => (vendors.data ?? []).filter((v) => v.archivedAt === null || v.id === expense?.vendorId),
    [vendors.data, expense?.vendorId],
  );

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      if (expense) {
        const body = expenseChanges(v, expense);
        // Saving a rejected expense resubmits it, even with no changes.
        if (Object.keys(body).length > 0 || resubmits) {
          const saved = await update.mutateAsync({ id: expense.id, body });
          toast.success(resubmits ? `Expense ${saved.expenseNumber} resubmitted for approval` : `Expense ${saved.expenseNumber} updated`);
          onSaved?.(saved);
        }
      } else {
        const saved = await create.mutateAsync(createExpenseBody(v));
        toast.success(saved.status === "APPROVED" ? `Expense ${saved.expenseNumber} recorded` : `Expense ${saved.expenseNumber} sent for approval`);
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      setFormErrors(applyServerErrorBy(setError, err, expenseErrorField));
    }
  });

  const loadError = [categories, properties, vendors].find((q) => q.isError);
  const submitLabel = isSubmitting ? "Saving..." : !expense ? (isOwner ? "Add expense" : "Send for approval") : resubmits ? "Save and resubmit" : "Save changes";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={expense ? `Edit expense ${expense.expenseNumber}` : "Add expense"}
      description={!expense && !isOwner ? "Your expenses go to the owner for approval." : undefined}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {expense?.status === "REJECTED" && expense.rejectionReason && (
          <InlineError
            className="md:col-span-2"
            title={`Rejected${expense.rejectedBy ? ` by ${expense.rejectedBy.name}` : ""}: ${expense.rejectionReason}`}
            description={resubmits ? "Fix it and save to send it for approval again." : undefined}
          />
        )}
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}
        {loadError && <InlineError title="Couldn't load the form's lists" description="Close and reopen to try again." className="md:col-span-2" />}

        <FormField label="Description" htmlFor="ef-description" required error={errors.description?.message} className="md:col-span-2">
          <Input id="ef-description" autoFocus autoComplete="off" placeholder="e.g. Boiler repair, Unit 4B" {...register("description")} />
        </FormField>
        <FormField label="Date" htmlFor="ef-date" required error={errors.date?.message}>
          <Input id="ef-date" type="date" {...register("date")} />
        </FormField>
        <FormField label="Amount" htmlFor="ef-amount" required error={errors.amount?.message}>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => <CurrencyInput id="ef-amount" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FormField>
        <FormField label="Category" htmlFor="ef-category" required error={errors.category?.message}>
          <Select
            id="ef-category"
            {...register("category", {
              onChange: (e: { target: { value: string } }) => {
                let touched = typeTouched;
                if (touched === null) {
                  touched = expense ? expense.type !== (defaultTypeOf(expense.category) ?? expense.type) : false;
                  setTypeTouched(touched);
                }
                const type = defaultTypeOf(e.target.value);
                if (type && !touched) setValue("type", type, { shouldDirty: true });
              },
            })}
          >
            <option value="">{categories.isPending ? "Loading categories..." : "Choose a category"}</option>
            {categories.data?.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Type" htmlFor="ef-type" required error={errors.type?.message} help="Set from the category; change it if needed.">
          <Select id="ef-type" {...register("type", { onChange: () => setTypeTouched(true) })}>
            {labelOptions(expenseTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Property" htmlFor="ef-property" required error={errors.propertyId?.message}>
          <Select id="ef-property" {...register("propertyId", { onChange: () => setValue("unitId", "", { shouldDirty: true }) })}>
            <option value="">{properties.isPending ? "Loading properties..." : "Choose a property"}</option>
            {isOwner && <option value={PORTFOLIO}>Portfolio-wide (no single property)</option>}
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Unit" htmlFor="ef-unit" error={errors.unitId?.message} help={propertyId && propertyId !== PORTFOLIO ? "Optional." : "Choose a property first."}>
          <Select id="ef-unit" disabled={!propertyId || propertyId === PORTFOLIO} {...register("unitId")}>
            <option value="">{units.isPending ? "Loading units..." : "Whole property"}</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Vendor" htmlFor="ef-vendor" error={errors.vendorId?.message}>
          <Select id="ef-vendor" {...register("vendorId")}>
            <option value="">{vendors.isPending ? "Loading vendors..." : "No vendor"}</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.archivedAt ? `${v.name} (archived)` : v.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Payment method" htmlFor="ef-method" error={errors.paymentMethod?.message}>
          <Select id="ef-method" {...register("paymentMethod")}>
            <option value="">Not set</option>
            {labelOptions(paymentMethodLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Reference" htmlFor="ef-reference" error={errors.reference?.message} help="Vendor invoice or other number." className="md:col-span-2">
          <Input id="ef-reference" autoComplete="off" {...register("reference")} />
        </FormField>
        <FormField label="Notes" htmlFor="ef-notes" error={errors.notes?.message} className="md:col-span-2">
          <Textarea id="ef-notes" {...register("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}
