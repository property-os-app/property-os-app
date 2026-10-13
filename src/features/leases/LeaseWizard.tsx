import { useMemo, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Caption } from "@/components/atoms";
import { InlineError, Stepper, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerError } from "@/lib/forms";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { useTenants } from "@/features/tenants/hooks";
import { useUnits } from "@/features/units/hooks";
import {
  STEPS,
  STEP_FIELDS,
  SERVER_FIELDS,
  createBody,
  defaults,
  firstErrorStep,
  formMissing,
  friendlyServerMessage,
  schema,
  serverErrorStep,
  updateBody,
  type FormInput,
  type FormOutput,
} from "@/features/leases/form";
import { useCreateLease, useUpdateLease } from "@/features/leases/hooks";
import { isClosed, leaseUnitLine } from "@/features/leases/stats";
import { DepositStep, PartiesStep, ReviewStep, TermsStep, type StepContext } from "@/features/leases/LeaseWizardSteps";
import type { PickedTenant } from "@/features/leases/TenantPicker";
import type { Lease } from "@/types/lease";
import type { Unit } from "@/types/unit";

type SubmitKind = "draft" | "activate" | "save";

export interface LeaseWizardProps {
  /** Edit this lease; without it the wizard creates one. */
  lease?: Lease;
  /** Create: preset unit (unit drawer). */
  presetUnit?: Unit;
  /** Create: preset primary tenant (tenant drawer). */
  presetTenantId?: string;
  /** After a successful save (before onClose). */
  onSaved?: (lease: Lease) => void;
  onClose: () => void;
}

/**
 * Add / Edit Lease: a 4-step modal (Parties, Terms, Deposit, Review). Continue checks only the step's format rules;
 * activation rules are checked on "Create & activate". Create: "Save as draft" (needs a unit) or one POST with status ACTIVE.
 * Edit: PATCH with only the changed fields; a DRAFT stays a DRAFT. Mount it only while open.
 */
export function LeaseWizard({ lease, presetUnit, presetTenantId, onSaved, onClose }: LeaseWizardProps) {
  const { propertyId: scope } = useScope();
  const isCreate = !lease;
  const closed = lease ? isClosed(lease) : false;
  const unitLocked = lease ? lease.status !== "DRAFT" : false;

  const create = useCreateLease();
  const update = useUpdateLease();
  const properties = useProperties();
  const tenants = useTenants();

  const [step, setStep] = useState(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [addingTenant, setAddingTenant] = useState<"primary" | "co" | null>(null);
  const [newTenants, setNewTenants] = useState<PickedTenant[]>([]);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaults({ lease, unit: presetUnit, propertyId: scope, tenantId: presetTenantId }),
    mode: "onTouched",
  });
  const { control, handleSubmit, setError, setValue, getValues, trigger, formState } = form;
  const { isDirty, isSubmitting } = formState;

  const values = useWatch({ control }) as FormInput;
  const propertyId = values.propertyId;
  const units = useUnits({ propertyId: propertyId || undefined });

  const lookupTenant = useMemo(() => {
    const map = new Map<string, PickedTenant>();
    for (const t of lease?.tenants ?? []) map.set(t.id, t);
    for (const t of tenants.data ?? []) map.set(t.id, t);
    for (const t of newTenants) map.set(t.id, t);
    return (id: string) => map.get(id);
  }, [lease, tenants.data, newTenants]);

  const missing = closed ? [] : formMissing(values);
  const busy = isSubmitting;
  const isLast = step === STEPS.length - 1;

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (!busy && confirmClose()) onClose();
  };

  const goTo = (next: number) => {
    setFormErrors([]);
    setStep(next);
  };

  const onContinue = async () => {
    if (await trigger(STEP_FIELDS[step])) goTo(step + 1);
  };

  const save = async (v: FormOutput, kind: SubmitKind) => {
    setFormErrors([]);
    try {
      if (!lease) {
        const saved = await create.mutateAsync(createBody(v, kind === "activate"));
        toast.success(
          kind === "activate"
            ? `Lease ${saved.leaseNumber} created and activated`
            : `Draft lease ${saved.leaseNumber} created for Unit ${saved.unit.unitNumber}`,
        );
        onSaved?.(saved);
      } else {
        const body = updateBody(v, lease);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: lease.id, body });
          toast.success(`Lease ${saved.leaseNumber} updated`);
          onSaved?.(saved);
        }
      }
      onClose();
    } catch (err) {
      // Field messages go under their field; the rest at the top of the step the error belongs to.
      const general = applyServerError(setError, err, SERVER_FIELDS);
      setStep(serverErrorStep(err, step));
      setFormErrors(general.map(friendlyServerMessage));
    }
  };

  const submit = (kind: SubmitKind) =>
    void handleSubmit(
      (v) => save(v, kind),
      (errors: FieldErrors<FormInput>) => goTo(firstErrorStep(errors)),
    )();

  const onTenantSaved = (t: PickedTenant) => {
    setNewTenants((list) => [...list, { id: t.id, fullName: t.fullName, email: t.email }]);
    if (addingTenant === "primary") {
      setValue("primaryTenantId", t.id, { shouldDirty: true });
      setValue("coTenantIds", getValues("coTenantIds").filter((id) => id !== t.id), { shouldDirty: true });
    } else if (t.id !== getValues("primaryTenantId") && !getValues("coTenantIds").includes(t.id)) {
      setValue("coTenantIds", [...getValues("coTenantIds"), t.id], { shouldDirty: true });
    }
  };

  const ctx: StepContext = {
    form,
    unitLocked,
    closed,
    properties: properties.data,
    propertiesPending: properties.isPending,
    units: units.data,
    unitsPending: units.isPending,
    unitLine: lease ? leaseUnitLine(lease) : "",
    lookupTenant,
    onAddTenant: setAddingTenant,
  };

  const blockedBySave = !isCreate && lease?.status === "ACTIVE" && missing.length > 0;

  const primaryButton = !isLast ? (
    <Button variant="primary" disabled={busy} onClick={() => void onContinue()}>
      Continue to {STEPS[step + 1]}
    </Button>
  ) : isCreate ? (
    <Button variant="primary" disabled={busy || missing.length > 0} aria-busy={busy || undefined} onClick={() => submit("activate")}>
      {busy ? "Saving..." : "Create & activate"}
    </Button>
  ) : (
    <Button variant="primary" disabled={busy || blockedBySave} aria-busy={busy || undefined} onClick={() => submit("save")}>
      {busy ? "Saving..." : "Save changes"}
    </Button>
  );

  return (
    <>
      <Modal
        open
        onOpenChange={(open) => !open && !busy && onClose()}
        confirmClose={confirmClose}
        size="lg"
        title={lease ? `Edit lease ${lease.leaseNumber}` : "Add Lease"}
        description={`Step ${step + 1} of ${STEPS.length}`}
        footer={
          <>
            {step > 0 && (
              <Button variant="ghost" className="mr-auto" disabled={busy} onClick={() => goTo(step - 1)}>
                Back
              </Button>
            )}
            <Button disabled={busy} onClick={requestClose}>
              Cancel
            </Button>
            {isCreate && (
              <Button disabled={busy} onClick={() => submit("draft")}>
                Save as draft
              </Button>
            )}
            {primaryButton}
          </>
        }
      >
        <Stepper steps={[...STEPS]} current={step} />
        {formErrors.length > 0 && <InlineError title={formErrors.join(" ")} />}

        {step === 0 && <PartiesStep {...ctx} />}
        {step === 1 && <TermsStep {...ctx} />}
        {step === 2 && <DepositStep {...ctx} />}
        {step === 3 && <ReviewStep {...ctx} isCreate={isCreate} leaseStatus={lease?.status} />}

        {isLast && isCreate && missing.length > 0 && (
          <Caption>"Create & activate" needs the missing fields above. "Save as draft" works now.</Caption>
        )}
      </Modal>

      {addingTenant && <TenantFormModal onSaved={onTenantSaved} onClose={() => setAddingTenant(null)} />}
    </>
  );
}
