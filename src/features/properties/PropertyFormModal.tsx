import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Caption, Checkbox, CurrencyInput, Input, Select, Skeleton, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerError } from "@/lib/forms";
import { centsToAmount, toCents } from "@/lib/format";
import { labelOptions, plural, propertyTypeLabels } from "@/lib/labels";
import { useAuth } from "@/features/auth/authContext";
import { useCreateProperty, useManagers, useUpdateProperty } from "@/features/properties/hooks";
import type { Property, PropertyCreateBody, PropertyType, PropertyUpdateBody } from "@/types/property";

const PROPERTY_TYPES = Object.keys(propertyTypeLabels) as [PropertyType, ...PropertyType[]];
/** Decimal(12,2) column: above this the backend gives a 500. */
const MAX_VALUE_CENTS = 999_999_999_999;
const STATE_RE = /^[A-Z]{2}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
/** "Number of units" on create: the Add Unit chain opens this many times. */
const MAX_UNIT_COUNT = 200;

const FIELDS = ["name", "street", "city", "state", "zip", "propertyType", "propertyValue", "acquisitionDate", "description", "managerIds"] as const;

const required = (what: string) => z.string().trim().min(1, `Enter the ${what}.`);

/**
 * Rules from ../property-os-api/docs/frontend-handoff/rules.md (Properties), plus the US formats for state and ZIP.
 * In edit mode state and ZIP are checked only when changed, so older values in another format can still be saved.
 */
function makeSchema(original?: Property) {
  const unchanged = (value: string, before: string | undefined) => before !== undefined && value === before;
  return z.object({
    name: required("name"),
    street: required("street"),
    city: required("city"),
    state: required("state")
      .transform((v) => v.toUpperCase())
      .refine((v) => unchanged(v, original?.state.toUpperCase()) || STATE_RE.test(v), "Use the 2-letter state code, e.g. CA."),
    zip: required("ZIP").refine((v) => unchanged(v, original?.zip) || ZIP_RE.test(v), "Use 5 digits or 5+4, e.g. 94110 or 94110-1234."),
    propertyType: z.string().min(1, "Choose a property type.").pipe(z.enum(PROPERTY_TYPES)),
    propertyValue: z
      .union([z.number(), z.literal("")])
      // The first check narrows the value to a number.
      .refine((v) => v !== "", "Enter the property value.")
      .refine((v) => toCents(v) > 0, "Property value must be more than $0.")
      .refine((v) => toCents(v) <= MAX_VALUE_CENTS, "Property value can be at most $9,999,999,999.99."),
    acquisitionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the acquisition date."),
    description: z.string().trim(),
    managerIds: z.array(z.string()),
    // Create only, never sent to the API.
    unitCount: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= MAX_UNIT_COUNT), `Use a whole number from 0 to ${MAX_UNIT_COUNT}.`)
      .transform((v) => (v === "" ? 0 : Number(v))),
  });
}

type FormInput = z.input<ReturnType<typeof makeSchema>>;
type FormOutput = z.output<ReturnType<typeof makeSchema>>;

function defaults(p?: Property): FormInput {
  return {
    name: p?.name ?? "",
    street: p?.street ?? "",
    city: p?.city ?? "",
    state: p?.state ?? "",
    zip: p?.zip ?? "",
    propertyType: p?.propertyType ?? "",
    propertyValue: p ? centsToAmount(toCents(p.propertyValue)) : "",
    // acquisitionDate is a full timestamp: keep only "YYYY-MM-DD" (never new Date()).
    acquisitionDate: p?.acquisitionDate.slice(0, 10) ?? "",
    description: p?.description ?? "",
    managerIds: [],
    unitCount: "",
  };
}

/** PATCH body with only the changed fields. description: null when the user cleared it. */
function changedFields(v: FormOutput, p: Property): PropertyUpdateBody {
  const body: PropertyUpdateBody = {};
  if (v.name !== p.name) body.name = v.name;
  if (v.street !== p.street) body.street = v.street;
  if (v.city !== p.city) body.city = v.city;
  if (v.state !== p.state.toUpperCase()) body.state = v.state;
  if (v.zip !== p.zip) body.zip = v.zip;
  if (v.propertyType !== p.propertyType) body.propertyType = v.propertyType;
  if (toCents(v.propertyValue) !== toCents(p.propertyValue)) body.propertyValue = v.propertyValue;
  if (v.acquisitionDate !== p.acquisitionDate.slice(0, 10)) body.acquisitionDate = v.acquisitionDate;
  if (v.description !== (p.description ?? "")) body.description = v.description === "" ? null : v.description;
  return body;
}

export interface PropertyFormModalProps {
  /** Edit this property; without it the modal creates one. */
  property?: Property;
  onClose: () => void;
  /** Create only: called with the new property and the "Number of units" (0 when empty), before onClose. */
  onCreated?: (property: Property, unitCount: number) => void;
}

/** Add / edit property modal (OWNER). Mount it only while open, so each opening starts with a fresh form. */
export function PropertyFormModal({ property, onClose, onCreated }: PropertyFormModalProps) {
  const isEdit = Boolean(property);
  const { me } = useAuth();
  const showManagers = !isEdit && me?.role === "OWNER";
  const managers = useManagers();
  const create = useCreateProperty();
  const update = useUpdateProperty();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const schema = useMemo(() => makeSchema(property), [property]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaults(property),
    mode: "onTouched",
  });

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      if (property) {
        const body = changedFields(v, property);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: property.id, body });
          toast.success(`Property ${saved.name} updated`);
        }
      } else {
        const body: PropertyCreateBody = {
          name: v.name,
          street: v.street,
          city: v.city,
          state: v.state,
          zip: v.zip,
          propertyType: v.propertyType,
          propertyValue: v.propertyValue,
          acquisitionDate: v.acquisitionDate,
          ...(v.description ? { description: v.description } : {}),
          ...(v.managerIds.length > 0 ? { managerIds: v.managerIds } : {}),
        };
        const saved = await create.mutateAsync(body);
        toast.success(`Property ${saved.name} created`);
        onCreated?.(saved, v.unitCount);
      }
      onClose();
    } catch (err) {
      setFormErrors(applyServerError(setError, err, FIELDS));
    }
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={isEdit ? "Edit property" : "Add property"}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="property-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add property"}
          </Button>
        </>
      }
    >
      <form id="property-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}

        <FormField label="Name" htmlFor="pf-name" required error={errors.name?.message} className="md:col-span-2">
          <Input id="pf-name" autoFocus {...register("name")} />
        </FormField>
        <FormField label="Street" htmlFor="pf-street" required error={errors.street?.message} className="md:col-span-2">
          <Input id="pf-street" autoComplete="street-address" {...register("street")} />
        </FormField>
        <FormField label="City" htmlFor="pf-city" required error={errors.city?.message}>
          <Input id="pf-city" {...register("city")} />
        </FormField>
        <FormField label="State" htmlFor="pf-state" required error={errors.state?.message} help={isEdit ? undefined : "2 letters, e.g. CA"}>
          <Input id="pf-state" className="uppercase" maxLength={isEdit ? undefined : 2} {...register("state")} />
        </FormField>
        <FormField label="ZIP" htmlFor="pf-zip" required error={errors.zip?.message}>
          <Input id="pf-zip" inputMode="numeric" {...register("zip")} />
        </FormField>
        <FormField label="Property type" htmlFor="pf-type" required error={errors.propertyType?.message}>
          <Select id="pf-type" {...register("propertyType")}>
            <option value="">Choose a type</option>
            {labelOptions(propertyTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Property value" htmlFor="pf-value" required error={errors.propertyValue?.message}>
          <Controller
            control={control}
            name="propertyValue"
            render={({ field }) => (
              <CurrencyInput id="pf-value" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </FormField>
        <FormField label="Acquisition date" htmlFor="pf-date" required error={errors.acquisitionDate?.message}>
          <Input id="pf-date" type="date" {...register("acquisitionDate")} />
        </FormField>
        {!isEdit && (
          <FormField
            label="Number of units"
            htmlFor="pf-units"
            error={errors.unitCount?.message}
            help="Optional. After saving, Add unit opens this many times."
          >
            <Input id="pf-units" inputMode="numeric" {...register("unitCount")} />
          </FormField>
        )}
        <FormField label="Description" htmlFor="pf-description" error={errors.description?.message} className="md:col-span-2">
          <Textarea id="pf-description" {...register("description")} />
        </FormField>

        {showManagers && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 md:col-span-2">
            <legend className="mb-1.5 text-small text-text-secondary">Assign managers</legend>
            {managers.isPending ? (
              <Skeleton className="h-16" />
            ) : managers.isError ? (
              <InlineError title="Couldn't load managers" onRetry={() => void managers.refetch()} />
            ) : managers.data.length === 0 ? (
              <Caption>No managers yet. Manager accounts are created by the developer for now.</Caption>
            ) : (
              <div className="flex flex-col gap-2 rounded-control border border-border-subtle p-3">
                {managers.data.map((m) => (
                  <Checkbox
                    key={m.id}
                    value={m.id}
                    {...register("managerIds")}
                    label={
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{m.name}</span>
                        <Caption>{m.email}</Caption>
                        <Caption>· {plural(m.assignedPropertyCount, "property", "properties")}</Caption>
                      </span>
                    }
                  />
                ))}
              </div>
            )}
            {errors.managerIds?.message && <Caption className="text-danger">{errors.managerIds.message}</Caption>}
          </fieldset>
        )}
      </form>
    </Modal>
  );
}
