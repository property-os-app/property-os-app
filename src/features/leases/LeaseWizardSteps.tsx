import { Controller, type UseFormReturn } from "react-hook-form";
import { Plus } from "lucide-react";
import { Body, Button, Caption, CurrencyInput, Dash, Input, Num, Select, Textarea, Toggle } from "@/components/atoms";
import { Card, FormField, KeyValueList, SegmentedControl } from "@/components/molecules";
import { centsToAmount, formatCurrency, formatDate, ordinal, parseDateOnly, todayISO, toCents } from "@/lib/format";
import { paymentFrequencyLabels, plural, signatureStatusLabels, labelOptions, unitStatusLabels } from "@/lib/labels";
import { compareNatural } from "@/lib/sort";
import { formMissing, type FormInput, type FormOutput } from "@/features/leases/form";
import { firstRentDate, termEndDate, termMonthsOf } from "@/features/leases/stats";
import { TagEditor } from "@/features/leases/TagEditor";
import { CoTenantPicker, TenantPicker, type PickedTenant } from "@/features/leases/TenantPicker";
import type { Property } from "@/types/property";
import type { Unit } from "@/types/unit";

type Form = UseFormReturn<FormInput, unknown, FormOutput>;

/** What every step needs from the wizard. */
export interface StepContext {
  form: Form;
  /** Unit can't change (lease is not a DRAFT). */
  unitLocked: boolean;
  /** ENDED / TERMINATED: only tags and notes can change. */
  closed: boolean;
  properties: Property[] | undefined;
  propertiesPending: boolean;
  /** Units of the chosen property (all visible units when none is chosen). */
  units: Unit[] | undefined;
  unitsPending: boolean;
  /** "Unit 4B, Maple Court" for a locked unit. */
  unitLine: string;
  lookupTenant: (id: string) => PickedTenant | undefined;
  /** Opens TenantFormModal over the wizard; the new tenant becomes the primary or a co-tenant. */
  onAddTenant: (role: "primary" | "co") => void;
  /** The user typed a due day (or edits a lease that has one): the start date no longer sets it. */
  dueDayManual: boolean;
  onDueDayEdited: () => void;
}

/** The due day as a number, or null when the field isn't a whole number from 1 to 31. */
function dueDayOf(value: string): number | null {
  const v = value.trim();
  return /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31 ? Number(v) : null;
}

const TERMS = ["3", "6", "9", "12", "24"] as const;
type Term = (typeof TERMS)[number] | "";

/** A value that can't be edited, shown as a disabled input. */
function ReadOnly({ id, value }: { id: string; value: string }) {
  return <Input id={id} value={value} readOnly disabled />;
}

const moneyText = (v: number | "") => (v === "" ? "" : formatCurrency(v));

/* ---------- Step 1: Parties ---------- */

export function PartiesStep(ctx: StepContext) {
  const { form, unitLocked, closed, properties, units, lookupTenant, onAddTenant } = ctx;
  const { register, watch, setValue, getValues, formState: { errors } } = form;
  const propertyId = watch("propertyId");
  const primaryId = watch("primaryTenantId");
  const coIds = watch("coTenantIds");

  const unitField = register("unitId");
  const names = new Map(properties?.map((p) => [p.id, p.name]));
  const sortedUnits = [...(units ?? [])].sort(
    (a, b) => compareNatural(names.get(a.propertyId) ?? "", names.get(b.propertyId) ?? "") || compareNatural(a.unitNumber, b.unitNumber),
  );

  /** After the unit changes: fill an empty property, and prefill the rent with the listed rent unless the user typed another amount. */
  const onUnitChange = (beforeId: string, unitId: string) => {
    const before = units?.find((u) => u.id === beforeId);
    const next = units?.find((u) => u.id === unitId);
    if (!next) return;
    if (!getValues("propertyId")) setValue("propertyId", next.propertyId);
    const rent = getValues("rent");
    if (rent === "" || (before && toCents(rent) === toCents(before.monthlyRent))) {
      setValue("rent", centsToAmount(toCents(next.monthlyRent)), { shouldDirty: true });
    }
  };

  const setPrimary = (t: PickedTenant | null) => {
    setValue("primaryTenantId", t?.id ?? "", { shouldDirty: true });
    // Never both: a co-tenant chosen as primary leaves the co-tenants.
    if (t && coIds.includes(t.id)) setValue("coTenantIds", coIds.filter((id) => id !== t.id), { shouldDirty: true });
  };

  const addTenantLink = (role: "primary" | "co") => (
    <Button size="sm" variant="ghost" icon={<Plus size={14} strokeWidth={1.5} />} onClick={() => onAddTenant(role)}>
      Add new tenant
    </Button>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {unitLocked ? (
        <FormField label="Unit" htmlFor="lw-unit" help="The unit can change only on a draft." className="md:col-span-2">
          <ReadOnly id="lw-unit" value={ctx.unitLine} />
        </FormField>
      ) : (
        <>
          <FormField label="Property" htmlFor="lw-property" help="Only filters the units.">
            <Select
              id="lw-property"
              {...register("propertyId", {
                onChange: (e: { target: { value: string } }) => {
                  // A unit of another property can't stay chosen.
                  const unit = units?.find((u) => u.id === getValues("unitId"));
                  if (unit && e.target.value && unit.propertyId !== e.target.value) setValue("unitId", "", { shouldDirty: true });
                },
              })}
            >
              <option value="">{ctx.propertiesPending ? "Loading properties..." : "All properties"}</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Unit" htmlFor="lw-unit" required error={errors.unitId?.message}>
            <Select
              id="lw-unit"
              {...unitField}
              onChange={(e) => {
                const before = getValues("unitId");
                void unitField.onChange(e);
                onUnitChange(before, e.target.value);
              }}
            >
              <option value="">{ctx.unitsPending ? "Loading units..." : sortedUnits.length === 0 ? "No units" : "Choose a unit"}</option>
              {sortedUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {propertyId ? "" : `${names.get(u.propertyId) ?? ""}: `}Unit {u.unitNumber} · {unitStatusLabels[u.status]}
                  {u.status === "OCCUPIED" ? " (has an active lease)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}

      <FormField
        label="Primary tenant"
        htmlFor="lw-primary"
        help={closed ? undefined : "Required to activate."}
        error={errors.primaryTenantId?.message}
        action={closed ? undefined : addTenantLink("primary")}
        className="md:col-span-2"
      >
        {closed ? (
          <ReadOnly id="lw-primary" value={primaryId ? (lookupTenant(primaryId)?.fullName ?? "") : "None"} />
        ) : (
          <TenantPicker id="lw-primary" value={primaryId} onChange={setPrimary} lookup={lookupTenant} />
        )}
      </FormField>

      <FormField
        label="Co-tenants"
        htmlFor="lw-co"
        error={errors.coTenantIds?.message}
        action={closed ? undefined : addTenantLink("co")}
        className="md:col-span-2"
      >
        {closed ? (
          <ReadOnly id="lw-co" value={coIds.map((id) => lookupTenant(id)?.fullName ?? "").join(", ") || "None"} />
        ) : (
          <CoTenantPicker
            id="lw-co"
            value={coIds}
            onChange={(ids) => setValue("coTenantIds", ids, { shouldDirty: true })}
            lookup={lookupTenant}
            primaryId={primaryId}
          />
        )}
      </FormField>
    </div>
  );
}

/* ---------- Step 2: Terms ---------- */

export function TermsStep({ form, closed, units, dueDayManual, onDueDayEdited }: StepContext) {
  const { register, control, watch, setValue, getValues, formState: { errors } } = form;
  const start = watch("startDate");
  const end = watch("endDate");
  const unit = units?.find((u) => u.id === watch("unitId"));
  const months = termMonthsOf(start, end);
  const term: Term = months !== null && (TERMS as readonly string[]).includes(String(months)) ? (String(months) as Term) : "";
  const dueDay = dueDayOf(watch("rentDueDay"));
  const firstRent = firstRentDate(start, dueDay);

  /** Rent is billed on the move-in day: the due day follows the start date until the user sets it by hand. */
  const followStart = (from: string) => {
    const day = parseDateOnly(from)?.d;
    if (dueDayManual || day === undefined) return;
    setValue("rentDueDay", String(day), { shouldDirty: true, shouldValidate: Boolean(errors.rentDueDay) });
  };

  const pickTerm = (value: Term) => {
    if (!value) return;
    const from = getValues("startDate") || todayISO();
    setValue("startDate", from, { shouldDirty: true });
    setValue("endDate", termEndDate(from, Number(value)) ?? "", { shouldDirty: true, shouldValidate: true });
    followStart(from);
  };

  const dueHelp =
    dueDay === null
      ? "Defaults to the day of the start date."
      : `Rent is billed on the ${ordinal(dueDay)} of each month${start ? `, starting ${formatDate(start)}` : ""}.${dueDay >= 29 ? " In shorter months, the last day of the month." : ""}`;

  if (closed) {
    const v = form.getValues();
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Start date" htmlFor="lw-start"><ReadOnly id="lw-start" value={formatDate(v.startDate)} /></FormField>
        <FormField label="End date" htmlFor="lw-end"><ReadOnly id="lw-end" value={formatDate(v.endDate)} /></FormField>
        <FormField label="Monthly rent" htmlFor="lw-rent"><ReadOnly id="lw-rent" value={moneyText(v.rent)} /></FormField>
        <FormField label="Rent due day" htmlFor="lw-due"><ReadOnly id="lw-due" value={v.rentDueDay} /></FormField>
        <FormField label="Late fee" htmlFor="lw-fee"><ReadOnly id="lw-fee" value={moneyText(v.lateFeeAmount)} /></FormField>
        <FormField label="Grace period (days)" htmlFor="lw-grace"><ReadOnly id="lw-grace" value={v.lateFeeGraceDays} /></FormField>
        <FormField label="Auto-renew" htmlFor="lw-renew"><ReadOnly id="lw-renew" value={v.autoRenew ? "On" : "Off"} /></FormField>
        <Caption className="md:col-span-2">This lease is closed: only tags and notes can change.</Caption>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Start date" htmlFor="lw-start" required error={errors.startDate?.message}>
        <Input id="lw-start" type="date" {...register("startDate", { deps: ["endDate"], onChange: (e) => followStart(e.target.value) })} />
      </FormField>
      <FormField label="End date" htmlFor="lw-end" required error={errors.endDate?.message}>
        <Input id="lw-end" type="date" {...register("endDate")} />
      </FormField>

      <div className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-small text-text-secondary">Lease term</span>
        <SegmentedControl<Term>
          aria-label="Lease term in months"
          value={term}
          onChange={pickTerm}
          segments={TERMS.map((m) => ({ value: m, label: `${m} months` }))}
          className="w-fit max-w-full flex-wrap"
        />
        <Caption>{start ? "Sets the end date from the start date." : "Sets the start date to today and the end date from it."}</Caption>
      </div>

      <FormField
        label="Monthly rent"
        htmlFor="lw-rent"
        required
        error={errors.rent?.message}
        help={unit ? `Listed rent for Unit ${unit.unitNumber} is ${formatCurrency(unit.monthlyRent)}` : undefined}
      >
        <Controller
          control={control}
          name="rent"
          render={({ field }) => <CurrencyInput id="lw-rent" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
        />
      </FormField>
      <FormField label="Payment frequency" htmlFor="lw-frequency" help="Monthly for now.">
        <ReadOnly id="lw-frequency" value={paymentFrequencyLabels[watch("paymentFrequency")]} />
      </FormField>

      <FormField label="Rent due day" htmlFor="lw-due" required error={errors.rentDueDay?.message} help={dueHelp}>
        <Input id="lw-due" inputMode="numeric" {...register("rentDueDay", { onChange: onDueDayEdited })} />
      </FormField>
      {firstRent && firstRent !== start ? (
        <Caption className="md:pt-7">
          The first rent date is {formatDate(firstRent)}. The days from {formatDate(start)} to then aren't billed automatically; you can bill them from the Rent Roll.
        </Caption>
      ) : (
        <div className="hidden md:block" />
      )}

      <FormField label="Late fee" htmlFor="lw-fee" error={errors.lateFeeAmount?.message}>
        <Controller
          control={control}
          name="lateFeeAmount"
          render={({ field }) => <CurrencyInput id="lw-fee" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
        />
      </FormField>
      <FormField label="Grace period (days)" htmlFor="lw-grace" error={errors.lateFeeGraceDays?.message}>
        <Input id="lw-grace" inputMode="numeric" {...register("lateFeeGraceDays")} />
      </FormField>

      <Card padding="compact" className="flex items-center justify-between gap-4 md:col-span-2">
        <div>
          <div className="font-semibold text-text-primary">Auto-renew</div>
          <Caption>Flag this lease for renewal when the term ends.</Caption>
        </div>
        <Controller
          control={control}
          name="autoRenew"
          render={({ field }) => <Toggle aria-label="Auto-renew" checked={field.value} onChange={field.onChange} />}
        />
      </Card>
    </div>
  );
}

/* ---------- Step 3: Deposit ---------- */

export function DepositStep({ form, closed }: StepContext) {
  const { register, control, getValues, setValue, formState: { errors } } = form;
  const v = getValues();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {closed ? (
        <FormField label="Security deposit" htmlFor="lw-deposit"><ReadOnly id="lw-deposit" value={moneyText(v.deposit)} /></FormField>
      ) : (
        <FormField
          label="Security deposit"
          htmlFor="lw-deposit"
          required
          error={errors.deposit?.message}
          action={
            <Button size="sm" variant="ghost" onClick={() => setValue("deposit", getValues("rent"), { shouldDirty: true, shouldValidate: true })}>
              Same as rent
            </Button>
          }
        >
          <Controller
            control={control}
            name="deposit"
            render={({ field }) => <CurrencyInput id="lw-deposit" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FormField>
      )}

      {closed ? (
        <FormField label="E-signature status" htmlFor="lw-esign"><ReadOnly id="lw-esign" value={signatureStatusLabels[v.signatureStatus]} /></FormField>
      ) : (
        <FormField label="E-signature status" htmlFor="lw-esign" error={errors.signatureStatus?.message}>
          <Select id="lw-esign" {...register("signatureStatus")}>
            {labelOptions(signatureStatusLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Tags" htmlFor="lw-tags-tag-input" error={errors.tags?.message} className="md:col-span-2">
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagEditor idPrefix="lw-tags" value={field.value} onChange={field.onChange} />}
        />
      </FormField>

      <FormField label="Notes" htmlFor="lw-notes" error={errors.notes?.message} className="md:col-span-2">
        <Textarea id="lw-notes" {...register("notes")} />
      </FormField>
    </div>
  );
}

/* ---------- Step 4: Review ---------- */

export function ReviewStep({ form, closed, units, unitLine, lookupTenant, isCreate, leaseStatus }: StepContext & { isCreate: boolean; leaseStatus?: string }) {
  const v = form.watch();
  const unit = units?.find((u) => u.id === v.unitId);
  const months = termMonthsOf(v.startDate, v.endDate);
  const missing = closed ? [] : formMissing(v);
  const coNames = v.coTenantIds.map((id) => lookupTenant(id)?.fullName ?? "").filter(Boolean);
  const dueDay = dueDayOf(v.rentDueDay);
  const firstRent = firstRentDate(v.startDate, dueDay);
  const lateFee = v.lateFeeAmount === "" ? 0 : v.lateFeeAmount;

  const missingNote = isCreate
    ? "Fill these in to create and activate the lease, or save it as a draft."
    : leaseStatus === "ACTIVE"
      ? "An active lease needs all of these before you can save."
      : "You can save the draft now and activate it later.";

  return (
    <div className="flex flex-col gap-4">
      {missing.length > 0 && (
        <Card padding="compact" className="flex flex-col gap-1 border-warning/40 bg-warning-soft">
          <div className="font-semibold text-warning">Missing to activate</div>
          <ul className="m-0 list-disc pl-5 text-body text-text-primary">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Caption>{missingNote}</Caption>
        </Card>
      )}
      <KeyValueList
        labelWidth={150}
        items={[
          { label: "Unit", value: unit ? `Unit ${unit.unitNumber}` : unitLine || <Dash /> },
          { label: "Primary tenant", value: v.primaryTenantId ? (lookupTenant(v.primaryTenantId)?.fullName ?? <Dash />) : <Dash /> },
          { label: "Co-tenants", value: coNames.length > 0 ? coNames.join(", ") : <Dash /> },
          {
            label: "Term",
            value:
              v.startDate || v.endDate ? (
                <span>
                  {formatDate(v.startDate)} to {formatDate(v.endDate)}
                  {months !== null && <Caption className="ml-2">{plural(months, "month")}</Caption>}
                </span>
              ) : (
                <Dash />
              ),
          },
          {
            label: "Rent",
            value:
              v.rent === "" ? (
                <Dash />
              ) : (
                <Num>
                  {formatCurrency(v.rent)}
                  {dueDay !== null ? `, billed on the ${ordinal(dueDay)} of each month` : ""}
                  {firstRent ? `, first rent ${formatDate(firstRent)}` : ""}
                </Num>
              ),
          },
          { label: "Payment frequency", value: paymentFrequencyLabels[v.paymentFrequency] },
          {
            label: "Late fee",
            value: <Num>{lateFee === 0 ? "None" : `${formatCurrency(lateFee)} after a ${v.lateFeeGraceDays || 0}-day grace period`}</Num>,
          },
          { label: "Security deposit", value: v.deposit === "" ? <Dash /> : <Num>{formatCurrency(v.deposit)}</Num> },
          { label: "Auto-renew", value: v.autoRenew ? "On" : "Off" },
          { label: "Tags", value: v.tags.length > 0 ? v.tags.join(", ") : <Dash /> },
          { label: "E-signature", value: signatureStatusLabels[v.signatureStatus] },
          { label: "Notes", value: v.notes.trim() ? <Body as="span" className="whitespace-pre-line">{v.notes.trim()}</Body> : <Dash /> },
        ]}
      />
    </div>
  );
}
