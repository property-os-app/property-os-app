import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { centsToAmount, toCents } from "@/lib/format";
import { labelOptions, unitStatusLabels, unitTypeLabels } from "@/lib/labels";
import { useProperties } from "@/features/properties/hooks";
import { useCreateUnit, useUnits, useUpdateUnit } from "@/features/units/hooks";
import type { Unit, UnitCreateBody, UnitStatus, UnitType, UnitUpdateBody } from "@/types/unit";

const UNIT_TYPES = Object.keys(unitTypeLabels) as [UnitType, ...UnitType[]];
/** The statuses a user may pick. OCCUPIED is set only by activating a lease. */
const EDITABLE_STATUSES = ["VACANT", "RESERVED", "UNDER_MAINTENANCE"] as const satisfies readonly UnitStatus[];
/** monthlyRent: more than 0, at most 99,999,999.99 (API.md, POST /units). */
const MAX_RENT_CENTS = 9_999_999_999;
/** floor and bathrooms are 32-bit integers: floor -2,147,483,648 to 2,147,483,647, bathrooms 0 to 2,147,483,647. */
const MIN_INT = -2_147_483_648;
const MAX_INT = 2_147_483_647;

const FIELDS = ["propertyId", "unitNumber", "unitType", "floorArea", "floor", "bathrooms", "monthlyRent", "status", "description"] as const;

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const INT_RE = /^-?\d+$/;
const WHOLE_RE = /^\d+$/;

/** "" -> null, else the integer. Only called after the regex check. */
const toIntOrNull = (v: string) => (v === "" ? null : Number(v));

/**
 * Rules from ../property-os-api/docs/frontend-handoff/rules.md (Units). Unit numbers are unique per property ignoring case
 * (backend 409); the form checks the same first (trimmed, case-insensitive, same property, never the unit itself).
 */
function makeSchema(units: Unit[], propertyName: (id: string) => string, editing?: Unit) {
  return z
    .object({
      propertyId: z.string().min(1, "Choose a property."),
      unitNumber: z.string().trim().min(1, "Enter the unit number."),
      unitType: z.string().min(1, "Choose a unit type.").pipe(z.enum(UNIT_TYPES)),
      floorArea: z
        .string()
        .trim()
        .min(1, "Enter the floor area.")
        .refine((v) => DECIMAL_RE.test(v), "Use a number, e.g. 750 or 750.5.")
        .refine((v) => Number(v) > 0, "Floor area must be more than 0.")
        .transform(Number),
      floor: z
        .string()
        .trim()
        .refine((v) => v === "" || INT_RE.test(v), "Use a whole number, e.g. 3 or -1.")
        .refine((v) => v === "" || !INT_RE.test(v) || (Number(v) >= MIN_INT && Number(v) <= MAX_INT), "Floor must be between -2,147,483,648 and 2,147,483,647.")
        .transform(toIntOrNull),
      bathrooms: z
        .string()
        .trim()
        .refine((v) => v === "" || WHOLE_RE.test(v), "Use a whole number, 0 or more.")
        .refine((v) => v === "" || !WHOLE_RE.test(v) || Number(v) <= MAX_INT, "Bathrooms can be at most 2,147,483,647.")
        .transform(toIntOrNull),
      monthlyRent: z
        .union([z.number(), z.literal("")])
        // The first check narrows the value to a number.
        .refine((v) => v !== "", "Enter the monthly rent.")
        .refine((v) => toCents(v) > 0, "Monthly rent must be more than $0.")
        .refine((v) => toCents(v) <= MAX_RENT_CENTS, "Monthly rent can be at most $99,999,999.99."),
      status: z.string(),
      description: z.string().trim(),
    })
    .superRefine((v, ctx) => {
      const number = v.unitNumber.toLowerCase();
      const taken = units.some(
        (u) => u.propertyId === v.propertyId && u.id !== editing?.id && u.unitNumber.trim().toLowerCase() === number,
      );
      if (number && taken) {
        ctx.addIssue({ code: "custom", path: ["unitNumber"], message: `Unit ${v.unitNumber} already exists in ${propertyName(v.propertyId)}.` });
      }
    });
}

type FormInput = z.input<ReturnType<typeof makeSchema>>;
type FormOutput = z.output<ReturnType<typeof makeSchema>>;

function defaults(unit: Unit | undefined, propertyId: string): FormInput {
  return {
    propertyId: unit?.propertyId ?? propertyId,
    unitNumber: unit?.unitNumber ?? "",
    unitType: unit?.unitType ?? "",
    floorArea: unit ? String(unit.floorArea) : "",
    floor: unit?.floor != null ? String(unit.floor) : "",
    bathrooms: unit?.bathrooms != null ? String(unit.bathrooms) : "",
    monthlyRent: unit ? centsToAmount(toCents(unit.monthlyRent)) : "",
    status: unit?.status ?? "VACANT",
    description: unit?.description ?? "",
  };
}

/** PATCH body with only the changed fields. floor, bathrooms, description: null when the user cleared them. Status only when editable. */
function changedFields(v: FormOutput, u: Unit): UnitUpdateBody {
  const body: UnitUpdateBody = {};
  if (v.unitNumber !== u.unitNumber) body.unitNumber = v.unitNumber;
  if (v.unitType !== u.unitType) body.unitType = v.unitType;
  if (v.floorArea !== u.floorArea) body.floorArea = v.floorArea;
  if (v.floor !== u.floor) body.floor = v.floor;
  if (v.bathrooms !== u.bathrooms) body.bathrooms = v.bathrooms;
  if (toCents(v.monthlyRent) !== toCents(u.monthlyRent)) body.monthlyRent = v.monthlyRent;
  if (u.status !== "OCCUPIED" && v.status !== u.status) body.status = v.status as UnitUpdateBody["status"];
  if (v.description !== (u.description ?? "")) body.description = v.description === "" ? null : v.description;
  return body;
}

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
  const schema = useMemo(() => makeSchema(allUnits.data ?? [], propertyName, unit), [allUnits.data, propertyName, unit]);
  const statusLocked = unit?.status === "OCCUPIED";

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaults(unit, defaultPropertyId ?? ""),
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
        const body = changedFields(v, unit);
        saved = Object.keys(body).length > 0 ? await update.mutateAsync({ id: unit.id, body }) : unit;
        if (saved !== unit) toast.success(`Unit ${saved.unitNumber} updated`);
      } else {
        const body: UnitCreateBody = {
          propertyId: v.propertyId,
          unitNumber: v.unitNumber,
          unitType: v.unitType,
          floorArea: v.floorArea,
          monthlyRent: v.monthlyRent,
          status: v.status as UnitCreateBody["status"],
          ...(v.floor !== null ? { floor: v.floor } : {}),
          ...(v.bathrooms !== null ? { bathrooms: v.bathrooms } : {}),
          ...(v.description ? { description: v.description } : {}),
        };
        saved = await create.mutateAsync(body);
        toast.success(`Unit ${saved.unitNumber} added to ${propertyName(saved.propertyId)}`);
      }
      (onSaved ?? onClose)(saved);
    } catch (err) {
      // 409 "Unit {n} already exists in this property." belongs under the number (it doesn't start with a field name).
      if (err instanceof ApiError && err.status === 409) {
        setError("unitNumber", { type: "server", message: err.messages.join(" ") }, { shouldFocus: true });
        return;
      }
      setFormErrors(applyServerError(setError, err, FIELDS));
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
        <FormField label="Floor area (sq ft)" htmlFor="uf-area" required error={errors.floorArea?.message}>
          <Input id="uf-area" inputMode="decimal" {...register("floorArea")} />
        </FormField>
        <FormField label="Monthly rent" htmlFor="uf-rent" required error={errors.monthlyRent?.message}>
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
