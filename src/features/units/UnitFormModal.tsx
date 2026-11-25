import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { labelOptions, unitStatusLabels, unitTypeLabels, unitLabel } from "@/lib/labels";
import { useProperties } from "@/features/properties/hooks";
import { EDITABLE_STATUSES, makeUnitSchema, unitChanges, unitCreateBody, unitDefaults, UNIT_FIELDS, type UnitFormInput, type UnitFormOutput } from "@/features/units/form";
import { useCreateUnit, useUnits, useUpdateUnit } from "@/features/units/hooks";
import type { Unit } from "@/types/unit";

export interface UnitFormModalProps {
  /** Edit this unit; without it the modal creates one. */
  unit?: Unit;
  /** Create only: the preselected property (the current scope or the page it was opened from). */
  defaultPropertyId?: string | null;
  /** "Add unit 1 of N" after Add Property: changes the title and buttons. */
  step?: { index: number; total: number };
  /** After a successful save. Defaults to onClose. In a chain the parent opens the next step or closes. */
  onSaved?: (unit: Unit) => void;
  /** Cancel, close, or "Skip the rest". */
  onClose: () => void;
}

/** Add / edit unit modal (OWNER, or a manager on the property). Mount it only while open (use a key per chain step). */
export function UnitFormModal({ unit, defaultPropertyId, step, onSaved, onClose }: UnitFormModalProps) {
  const isEdit = Boolean(unit);
  const properties = useProperties();
  const allUnits = useUnits();
  const create = useCreateUnit();
  const update = useUpdateUnit();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const propertyName = useMemo(() => {
    const names = new Map(properties.data?.map((p) => [p.id, p.name]));
    return (id: string) => names.get(id) ?? "this property";
  }, [properties.data]);
  const schema = useMemo(() => makeUnitSchema(allUnits.data ?? [], propertyName, unit), [allUnits.data, propertyName, unit]);
  const statusLocked = unit?.status === "OCCUPIED";

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UnitFormInput, unknown, UnitFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: unitDefaults(unit, defaultPropertyId ?? ""),
    mode: "onTouched",
  });

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      let saved: Unit;
      if (unit) {
        const body = unitChanges(v, unit);
        saved = Object.keys(body).length > 0 ? await update.mutateAsync({ id: unit.id, body }) : unit;
        if (saved !== unit) toast.success(`${unitLabel(saved.unitNumber)} updated`);
      } else {
        saved = await create.mutateAsync(unitCreateBody(v));
        toast.success(`${unitLabel(saved.unitNumber)} added to ${propertyName(saved.propertyId)}`);
      }
      (onSaved ?? onClose)(saved);
    } catch (err) {
      // 409 "Unit {n} already exists in this property." belongs under the number (it doesn't start with a field name).
      if (err instanceof ApiError && err.status === 409) {
        setError("unitNumber", { type: "server", message: err.messages.join(" ") }, { shouldFocus: true });
        return;
      }
      setFormErrors(applyServerError(setError, err, UNIT_FIELDS));
    }
  });

  const isLastStep = step ? step.index >= step.total : true;
  const title = isEdit ? "Edit unit" : step ? `Add unit ${step.index} of ${step.total}` : "Add unit";
  const submitLabel = isSubmitting ? "Saving..." : isEdit ? "Save changes" : step ? (isLastStep ? "Save" : "Save & add next") : "Add unit";

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={title}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            {step ? "Skip the rest" : "Cancel"}
          </Button>
          <Button type="submit" form="unit-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="unit-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}

        {isEdit ? (
          <FormField label="Property" htmlFor="uf-property" className="md:col-span-2">
            <Input id="uf-property" value={propertyName(unit!.propertyId)} readOnly disabled />
          </FormField>
        ) : (
          <FormField label="Property" htmlFor="uf-property" required error={errors.propertyId?.message} className="md:col-span-2">
            <Select id="uf-property" {...register("propertyId")}>
              <option value="">{properties.isPending ? "Loading properties..." : "Choose a property"}</option>
              {properties.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Unit number" htmlFor="uf-number" required error={errors.unitNumber?.message}>
          <Input id="uf-number" autoFocus {...register("unitNumber")} />
        </FormField>
        <FormField label="Unit type" htmlFor="uf-type" required error={errors.unitType?.message}>
          <Select id="uf-type" {...register("unitType")}>
            <option value="">Choose a type</option>
            {labelOptions(unitTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Floor area (sq ft)" htmlFor="uf-area" help="Optional" error={errors.floorArea?.message}>
          <Input id="uf-area" inputMode="decimal" {...register("floorArea")} />
        </FormField>
        <FormField label="Monthly rent" htmlFor="uf-rent" help="Optional. $0 is a real rent; empty means not set." error={errors.monthlyRent?.message}>
          <Controller
            control={control}
            name="monthlyRent"
            render={({ field }) => (
              <CurrencyInput id="uf-rent" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </FormField>
        <FormField label="Floor" htmlFor="uf-floor" error={errors.floor?.message} help="Negative for basement levels">
          <Input id="uf-floor" inputMode="numeric" {...register("floor")} />
        </FormField>
        <FormField label="Bathrooms" htmlFor="uf-baths" error={errors.bathrooms?.message}>
          <Input id="uf-baths" inputMode="numeric" {...register("bathrooms")} />
        </FormField>

        {statusLocked ? (
          <FormField label="Status" htmlFor="uf-status" help="Set by the active lease" className="md:col-span-2">
            <Input id="uf-status" value={unitStatusLabels.OCCUPIED} readOnly disabled />
          </FormField>
        ) : (
          <FormField label="Status" htmlFor="uf-status" error={errors.status?.message} className="md:col-span-2">
            <Select id="uf-status" {...register("status")}>
              {EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {unitStatusLabels[s]}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="Description" htmlFor="uf-description" error={errors.description?.message} className="md:col-span-2">
          <Textarea id="uf-description" {...register("description")} />
        </FormField>
      </form>
    </Modal>
  );
}
