import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Caption } from "@/components/atoms";
import { InlineError, Stepper, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerError } from "@/lib/forms";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useLeaseTemplates } from "@/features/lease-templates/hooks";
import { TemplateEditor } from "@/features/lease-templates/TemplateEditor";
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
  schema,
  serverErrorStep,
  updateBody,
  type FormInput,
  type FormOutput,
} from "@/features/leases/form";
import { useCreateLease, useUpdateLease } from "@/features/leases/hooks";
import { friendlyLeaseMessage, isClosed, leaseUnitLine } from "@/features/leases/stats";
import { DepositStep, PartiesStep, ReviewStep, TermsStep, type StepContext } from "@/features/leases/LeaseWizardSteps";
import type { PickedTenant } from "@/features/leases/TenantPicker";
import { templateEndDate } from "@/features/leases/templatePrefill";
import { templateOptions } from "@/features/leases/templateOptions";
import type { Lease } from "@/types/lease";
import type { LeaseTemplateListItem } from "@/types/leaseTemplate";
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
 * Template: a new lease preselects the default template (once the list loads); an existing lease keeps its template unless
 * the user changes it. A template's default term fills the end date (templateEndDate) until the user sets it by hand.
 */
export function LeaseWizard({ lease, presetUnit, presetTenantId, onSaved, onClose }: LeaseWizardProps) {
  const { propertyId: scope } = useScope();
  const { me } = useAuth();
  const isCreate = !lease;
  const closed = lease ? isClosed(lease) : false;
  const unitLocked = lease ? lease.status !== "DRAFT" : false;

  const create = useCreateLease();
  const update = useUpdateLease();
  const properties = useProperties();
  const tenants = useTenants();
  const templates = useLeaseTemplates({ enabled: !closed });

  const [step, setStep] = useState(0);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [addingTenant, setAddingTenant] = useState<"primary" | "co" | null>(null);
  const [newTenants, setNewTenants] = useState<PickedTenant[]>([]);
  // The due day follows the start date's day until set by hand. Edit keeps the saved value (follows only when it is empty).
  const [dueDayManual, setDueDayManual] = useState(lease ? lease.rentDueDay !== null : false);
  // Templates made with "+ New template" here, until GET /lease-templates refetches.
  const [newTemplates, setNewTemplates] = useState<LeaseTemplateListItem[]>([]);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  // The end date the template prefill wrote last; any other end date was set by hand and is never overwritten.
  const [autoEnd, setAutoEnd] = useState("");
  const defaultApplied = useRef(false);

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaults({ lease, unit: presetUnit, propertyId: scope, tenantId: presetTenantId }),
    mode: "onTouched",
  });
  const { control, register, handleSubmit, setError, setValue, getValues, resetField, trigger, formState } = form;
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

  const options = useMemo(() => templateOptions(templates.data ?? [], lease?.template ?? null, newTemplates), [templates.data, lease, newTemplates]);

  // New lease: preselect the default template once, as a default value (so it doesn't count as a change).
  useEffect(() => {
    if (!isCreate || defaultApplied.current || !templates.data) return;
    defaultApplied.current = true;
    const preset = templates.data.find((t) => t.isDefault);
    if (!preset || getValues("templateId") !== "") return;
    // resetField only works on a registered field, and the Terms step (where the select lives) may not be shown yet.
    register("templateId");
    resetField("templateId", { defaultValue: preset.id });
  }, [isCreate, templates.data, getValues, register, resetField]);

  /** Writes start + the template's term − 1 day into an empty or still-prefilled end date. */
  const fillEnd = (start: string, months: number | null | undefined) => {
    const end = templateEndDate({ start, end: getValues("endDate"), autoEnd, months });
    if (!end) return;
    setValue("endDate", end, { shouldDirty: true, shouldValidate: true });
    setAutoEnd(end);
  };
  const monthsOf = (id: string) => options.find((o) => o.value === id)?.months;

  const onTemplateSaved = (t: LeaseTemplateListItem) => {
    setNewTemplates((list) => [...list, t]);
    setValue("templateId", t.id, { shouldDirty: true });
    fillEnd(getValues("startDate"), t.defaultTermMonths);
  };

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
      setFormErrors(general.map(friendlyLeaseMessage));
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
    dueDayManual,
    onDueDayEdited: () => setDueDayManual(true),
    templates: options,
    templatesPending: templates.isPending,
    templatesError: templates.isError,
    // The backend checks the STORED signature status (409), so a lease saved as signed keeps its template.
    templateLocked:
      lease?.signatureStatus === "SIGNED"
        ? "Signed leases keep their template. To change it, set E-signature to Not sent or Pending, save, then edit again."
        : null,
    canCreateTemplate: can(me!, "template.manage"),
    onNewTemplate: () => setCreatingTemplate(true),
    onTemplateChange: (id) => fillEnd(getValues("startDate"), monthsOf(id)),
    onStartChange: (start) => fillEnd(start, monthsOf(getValues("templateId"))),
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
      {/* Opens over the wizard, which stays mounted, so nothing typed is lost. */}
      {creatingTemplate && <TemplateEditor onSaved={onTemplateSaved} onClose={() => setCreatingTemplate(false)} />}
    </>
  );
}
