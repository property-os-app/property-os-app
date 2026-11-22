import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { Button, Caption, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FileDropzone, FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { acceptOf, checkFile, PDF_RULE } from "@/lib/files";
import { unitLabel, unitStatusLabels } from "@/lib/labels";
import { compareNatural } from "@/lib/sort";
import { documentForm } from "@/features/documents/form";
import { uploadErrorText, useUploadDocument } from "@/features/documents/hooks";
import { PickedFile } from "@/features/documents/DocumentUpload";
import { useCreateOldLease } from "@/features/leases/hooks";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { emptyOldLease, lastOldLeaseEnd, oldLeaseBody, oldLeaseErrorField, validateOldLease, type OldLeaseErrors, type OldLeaseValues } from "@/features/leases/oldLeaseForm";
import { TagEditor } from "@/features/leases/TagEditor";
import { CoTenantPicker, TenantPicker, type PickedTenant } from "@/features/leases/TenantPicker";
import { useProperties } from "@/features/properties/hooks";
import { useTenants } from "@/features/tenants/hooks";
import { TenantFormModal } from "@/features/tenants/TenantFormModal";
import { useUnits } from "@/features/units/hooks";
import type { Unit } from "@/types/unit";

export interface OldLeaseModalProps {
  /** From the unit drawer: the unit is fixed. */
  presetUnit?: Unit;
  /** "Unit 4B, Maple Court" for the fixed unit. */
  presetUnitLine?: string;
  /** Preselects the property (the sidebar scope on the Leases page). */
  presetPropertyId?: string;
  /** Router state for the lease page when the signed copy fails to upload (it opens on the Documents tab). */
  leaseFrom: LeasePageState;
  onClose: () => void;
}

/**
 * "Add old lease": records a lease that ended before today (POST /leases/history, ENDED + SIGNED, never billed), then
 * uploads the optional signed PDF as a SIGNED_LEASE document. If only the upload fails, the lease stays saved and its page
 * opens on the Documents tab. Mount it only while open.
 */
export function OldLeaseModal({ presetUnit, presetUnitLine, presetPropertyId, leaseFrom, onClose }: OldLeaseModalProps) {
  const navigate = useNavigate();
  const create = useCreateOldLease();
  const upload = useUploadDocument();
  const properties = useProperties();
  const tenants = useTenants();
  const [values, setValues] = useState<OldLeaseValues>(() =>
    emptyOldLease({ propertyId: presetUnit?.propertyId ?? presetPropertyId, unitId: presetUnit?.id }),
  );
  const units = useUnits({ propertyId: values.propertyId || undefined });
  const [errors, setErrors] = useState<OldLeaseErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newTenants, setNewTenants] = useState<PickedTenant[]>([]);
  const [addingTenant, setAddingTenant] = useState<"primary" | "co" | null>(null);
  const busy = create.isPending || upload.isPending;
  const dirty = JSON.stringify(values) !== JSON.stringify(emptyOldLease({ propertyId: presetUnit?.propertyId ?? presetPropertyId, unitId: presetUnit?.id })) || file !== null;

  const confirmClose = () => !dirty || window.confirm("Discard this old lease?");

  const set = <K extends keyof OldLeaseValues>(key: K, value: OldLeaseValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const lookupTenant = useMemo(() => {
    const map = new Map<string, PickedTenant>();
    for (const t of tenants.data ?? []) map.set(t.id, t);
    for (const t of newTenants) map.set(t.id, t);
    return (id: string) => map.get(id);
  }, [tenants.data, newTenants]);

  const names = new Map(properties.data?.map((p) => [p.id, p.name]));
  const sortedUnits = [...(units.data ?? [])].sort(
    (a, b) => compareNatural(names.get(a.propertyId) ?? "", names.get(b.propertyId) ?? "") || compareNatural(a.unitNumber, b.unitNumber),
  );

  const setPrimary = (t: PickedTenant | null) => {
    setValues((v) => ({ ...v, primaryTenantId: t?.id ?? "", coTenantIds: t ? v.coTenantIds.filter((id) => id !== t.id) : v.coTenantIds }));
    setErrors((e) => ({ ...e, primaryTenantId: undefined, coTenantIds: undefined }));
  };

  const pickFile = (files: FileList) => {
    const next = files[0];
    if (!next) return;
    const problem = checkFile(next, PDF_RULE);
    setFileError(problem);
    setFile(problem ? null : next);
  };

  const submit = async () => {
    setTopError(null);
    const found = validateOldLease(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    let lease;
    try {
      lease = await create.mutateAsync(oldLeaseBody(values));
    } catch (err) {
      const messages = err instanceof ApiError && err.status < 500 && err.messages.length > 0 ? err.messages : [errorText(err)];
      const fieldErrors: OldLeaseErrors = {};
      const top: string[] = [];
      for (const m of messages) {
        const field = oldLeaseErrorField(m);
        if (field) fieldErrors[field] = [fieldErrors[field], m].filter(Boolean).join(" ");
        else top.push(m);
      }
      setErrors(fieldErrors);
      setTopError(top.length > 0 ? top.join(" ") : null);
      return;
    }

    if (file) {
      try {
        await upload.mutateAsync({ owner: "leases", ownerId: lease.id, form: documentForm(file, "SIGNED_LEASE") });
      } catch (err) {
        toast.error(`Old lease ${lease.leaseNumber} saved, but the signed lease didn't upload`, {
          description: `${uploadErrorText(err, PDF_RULE)} Upload it again from the Documents tab.`,
        });
        onClose();
        void navigate(`/leases/${encodeURIComponent(lease.id)}?tab=documents`, { state: leaseFrom });
        return;
      }
    }
    toast.success(`Old lease ${lease.leaseNumber} recorded${file ? " with the signed lease" : ""}`);
    onClose();
  };

  const addTenantLink = (role: "primary" | "co") => (
    <Button size="sm" variant="ghost" icon={<Plus size={14} strokeWidth={1.5} />} disabled={busy} onClick={() => setAddingTenant(role)}>
      Add new tenant
    </Button>
  );

  return (
    <>
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
              {create.isPending ? "Saving..." : upload.isPending ? "Uploading..." : "Save old lease"}
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

          <FormField label="Primary tenant" htmlFor="ol-primary" required error={errors.primaryTenantId} action={addTenantLink("primary")} className="md:col-span-2">
            <TenantPicker id="ol-primary" value={values.primaryTenantId} onChange={setPrimary} lookup={lookupTenant} />
          </FormField>
          <FormField label="Co-tenants" htmlFor="ol-co" error={errors.coTenantIds} action={addTenantLink("co")} className="md:col-span-2">
            <CoTenantPicker id="ol-co" value={values.coTenantIds} onChange={(ids) => set("coTenantIds", ids)} lookup={lookupTenant} primaryId={values.primaryTenantId} />
          </FormField>

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

          <FormField label="Notes" htmlFor="ol-notes" className="md:col-span-2">
            <Textarea id="ol-notes" rows={3} value={values.notes} disabled={busy} placeholder="e.g. From the previous owner's paper files" onChange={(e) => set("notes", e.target.value)} />
          </FormField>

          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-small text-text-secondary">Tags</span>
            <TagEditor idPrefix="ol-tags" value={values.tags} disabled={busy} onChange={(tags) => set("tags", tags)} />
            {errors.tags && <span className="text-small text-danger">{errors.tags}</span>}
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-small text-text-secondary">Signed lease (PDF)</span>
            {file ? (
              <PickedFile file={file} disabled={busy} onRemove={() => setFile(null)} />
            ) : (
              <FileDropzone multiple={false} accept={acceptOf(PDF_RULE)} hint={`Optional. PDF, up to ${PDF_RULE.maxText}`} chooseLabel="Choose file" onFiles={pickFile} disabled={busy} />
            )}
            {fileError ? (
              <span role="alert" className="text-small text-danger">
                {fileError}
              </span>
            ) : (
              <Caption>Uploaded right after saving, as the lease's "Signed lease" document.</Caption>
            )}
          </div>
        </form>
      </Modal>

      {addingTenant && (
        <TenantFormModal
          onSaved={(t) => {
            setNewTenants((list) => [...list, { id: t.id, fullName: t.fullName, email: t.email }]);
            if (addingTenant === "primary") setPrimary(t);
            else if (t.id !== values.primaryTenantId) set("coTenantIds", [...values.coTenantIds, t.id]);
          }}
          onClose={() => setAddingTenant(null)}
        />
      )}
    </>
  );
}
