import { useState } from "react";
import { Button, Caption, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FileDropzone, FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { acceptOf, checkFile, DOCUMENT_HINT, DOCUMENT_RULE } from "@/lib/files";
import { unitLabel, unitStatusLabels } from "@/lib/labels";
import { compareNatural } from "@/lib/sort";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { PickedFile } from "@/features/documents/DocumentUpload";
import { useCreateOldLease } from "@/features/leases/hooks";
import { emptyOldLease, lastOldLeaseEnd, oldLeaseBody, oldLeaseServerErrors, validateOldLease, type OldLeaseErrors, type OldLeaseValues } from "@/features/leases/oldLeaseForm";
import { OldLeaseTenants } from "@/features/leases/OldLeaseTenants";
import { TagEditor } from "@/features/leases/TagEditor";
import { useProperties } from "@/features/properties/hooks";
import { useUnits } from "@/features/units/hooks";
import type { Unit } from "@/types/unit";

export interface OldLeaseModalProps {
  /** From the unit page: the unit is fixed. */
  presetUnit?: Unit;
  /** "Unit 4B, Maple Court" for the fixed unit. */
  presetUnitLine?: string;
  /** Preselects the property (the sidebar scope on the Leases page). */
  presetPropertyId?: string;
  onClose: () => void;
}

/**
 * "Add old lease": records a lease that ended before today (ENDED + SIGNED, never billed) in one request: the lease, its new
 * tenants and the optional signed lease (a SIGNED_LEASE document). All or nothing, so after an error the form can be sent
 * again. Mount it only while open.
 */
export function OldLeaseModal({ presetUnit, presetUnitLine, presetPropertyId, onClose }: OldLeaseModalProps) {
  const { me } = useAuth();
  const create = useCreateOldLease();
  const properties = useProperties();
  const [values, setValues] = useState<OldLeaseValues>(() =>
    emptyOldLease({ propertyId: presetUnit?.propertyId ?? presetPropertyId, unitId: presetUnit?.id }),
  );
  const units = useUnits({ propertyId: values.propertyId || undefined });
  const [errors, setErrors] = useState<OldLeaseErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const busy = create.isPending;
  const dirty = JSON.stringify(values) !== JSON.stringify(emptyOldLease({ propertyId: presetUnit?.propertyId ?? presetPropertyId, unitId: presetUnit?.id })) || file !== null;

  const confirmClose = () => !dirty || window.confirm("Discard this old lease?");

  const set = <K extends keyof OldLeaseValues>(key: K, value: OldLeaseValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const names = new Map(properties.data?.map((p) => [p.id, p.name]));
  const sortedUnits = [...(units.data ?? [])].sort(
    (a, b) => compareNatural(names.get(a.propertyId) ?? "", names.get(b.propertyId) ?? "") || compareNatural(a.unitNumber, b.unitNumber),
  );

  const pickFile = (files: FileList) => {
    const next = files[0];
    if (!next) return;
    const problem = checkFile(next, DOCUMENT_RULE);
    setErrors((e) => ({ ...e, file: problem ?? undefined }));
    setFile(problem ? null : next);
  };

  const submit = async () => {
    setTopError(null);
    const found = validateOldLease(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      const saved = await create.mutateAsync({ body: oldLeaseBody(values), file });
      toast.success(`Old lease ${saved.leaseNumber} recorded${saved.document ? " with the signed lease" : ""}`);
      onClose();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status >= 500 || err.messages.length === 0) {
        setTopError(errorText(err));
        return;
      }
      const placed = oldLeaseServerErrors(err, values.tenants);
      setErrors(placed.errors);
      setTopError(placed.top || null);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onOpenChange={(open) => !open && !busy && onClose()}
      confirmClose={confirmClose}
      title="Add old lease"
      description="Record a lease that ended before today, for the history. It's saved as ended and signed, and no rent is tracked."
      footer={
        <>
          <Button disabled={busy} onClick={() => confirmClose() && onClose()}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} aria-busy={busy || undefined} onClick={() => void submit()}>
            {busy ? "Saving..." : "Save old lease"}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        {topError && <InlineError className="md:col-span-2" title="Couldn't save the old lease" description={topError} />}

        {presetUnit ? (
          <FormField label="Unit" htmlFor="ol-unit" className="md:col-span-2">
            <Input id="ol-unit" value={presetUnitLine ?? unitLabel(presetUnit.unitNumber)} readOnly disabled />
          </FormField>
        ) : (
          <>
            <FormField label="Property" htmlFor="ol-property" help="Only filters the units.">
              <Select
                id="ol-property"
                value={values.propertyId}
                disabled={busy}
                onChange={(e) => {
                  const propertyId = e.target.value;
                  const unit = units.data?.find((u) => u.id === values.unitId);
                  setValues((v) => ({ ...v, propertyId, unitId: unit && propertyId && unit.propertyId !== propertyId ? "" : v.unitId }));
                }}
              >
                <option value="">{properties.isPending ? "Loading properties..." : "All properties"}</option>
                {properties.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unit" htmlFor="ol-unit" required error={errors.unitId}>
              <Select
                id="ol-unit"
                value={values.unitId}
                disabled={busy}
                onChange={(e) => {
                  const unit = units.data?.find((u) => u.id === e.target.value);
                  set("unitId", e.target.value);
                  if (unit && !values.propertyId) set("propertyId", unit.propertyId);
                }}
              >
                <option value="">{units.isPending ? "Loading units..." : sortedUnits.length === 0 ? "No units" : "Choose a unit"}</option>
                {sortedUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {values.propertyId ? "" : `${names.get(u.propertyId) ?? ""}: `}
                    {unitLabel(u.unitNumber)} · {unitStatusLabels[u.status]}
                  </option>
                ))}
              </Select>
            </FormField>
          </>
        )}

        <div className="md:col-span-2">
          <OldLeaseTenants
            value={values}
            errors={errors}
            canAddNew={can(me!, "tenant.create")}
            disabled={busy}
            onChange={(next, clearRow) => {
              setValues((v) => ({ ...v, ...next }));
              setErrors((e) => ({
                ...e,
                tenants: undefined,
                newTenants: clearRow && e.newTenants ? Object.fromEntries(Object.entries(e.newTenants).filter(([key]) => key !== clearRow)) : e.newTenants,
              }));
            }}
          />
        </div>

        <FormField label="Start date" htmlFor="ol-start" required error={errors.startDate}>
          <Input id="ol-start" type="date" value={values.startDate} disabled={busy} max={lastOldLeaseEnd()} onChange={(e) => set("startDate", e.target.value)} />
        </FormField>
        <FormField label="End date" htmlFor="ol-end" required help={errors.endDate ? undefined : "Before today."} error={errors.endDate}>
          <Input
            id="ol-end"
            type="date"
            value={values.endDate}
            disabled={busy}
            min={values.startDate || undefined}
            max={lastOldLeaseEnd()}
            onChange={(e) => {
              set("endDate", e.target.value);
              setErrors((er) => ({ ...er, endDate: undefined }));
            }}
          />
        </FormField>

        <FormField label="Monthly rent" htmlFor="ol-rent" help={errors.rent ? undefined : "Optional."} error={errors.rent}>
          <CurrencyInput id="ol-rent" value={values.rent} disabled={busy} onChange={(v) => set("rent", v)} />
        </FormField>
        <FormField label="Security deposit" htmlFor="ol-deposit" help={errors.deposit ? undefined : "Optional."} error={errors.deposit}>
          <CurrencyInput id="ol-deposit" value={values.deposit} disabled={busy} onChange={(v) => set("deposit", v)} />
        </FormField>

        <FormField label="Notes" htmlFor="ol-notes" error={errors.notes} className="md:col-span-2">
          <Textarea id="ol-notes" rows={3} value={values.notes} disabled={busy} placeholder="e.g. From the previous owner's paper files" onChange={(e) => set("notes", e.target.value)} />
        </FormField>

        <div className="flex flex-col gap-2 md:col-span-2">
          <span className="text-small text-text-secondary">Tags</span>
          <TagEditor idPrefix="ol-tags" value={values.tags} disabled={busy} onChange={(tags) => set("tags", tags)} />
          {errors.tags && <span className="text-small text-danger">{errors.tags}</span>}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <span className="text-small text-text-secondary">Signed lease</span>
          {file ? (
            <PickedFile
              file={file}
              disabled={busy}
              onRemove={() => {
                setFile(null);
                setErrors((e) => ({ ...e, file: undefined }));
              }}
            />
          ) : (
            <FileDropzone multiple={false} accept={acceptOf(DOCUMENT_RULE)} hint={`Optional. ${DOCUMENT_HINT}`} chooseLabel="Choose file" onFiles={pickFile} disabled={busy} />
          )}
          {errors.file ? (
            <span role="alert" className="text-small text-danger">
              {errors.file}
            </span>
          ) : (
            <Caption>Saved with the lease, as its "Signed lease" document.</Caption>
          )}
        </div>
      </form>
    </Modal>
  );
}
