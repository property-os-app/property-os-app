import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Select, Skeleton, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { contactMethodLabels, labelOptions, tenantTypeLabels } from "@/lib/labels";
import { TENANT_FIELDS, tenantChanges, tenantCreateBody, tenantDefaults, tenantSchema, type TenantFormInput, type TenantFormOutput } from "@/features/tenants/form";
import { useCreateTenant, useTenant, useUpdateTenant } from "@/features/tenants/hooks";
import type { Tenant, TenantDetail } from "@/types/tenant";

export interface TenantFormModalProps {
  /** Edit this tenant (loads GET /tenants/:id for the idNumber); without it the modal creates one. */
  tenantId?: string;
  /** After a successful save, before onClose (the lease wizard selects the new tenant). */
  onSaved?: (tenant: Tenant) => void;
  onClose: () => void;
}

/** Add / edit tenant modal (OWNER and managers). Mount it only while open. */
export function TenantFormModal({ tenantId, onSaved, onClose }: TenantFormModalProps) {
  return tenantId ? <EditTenant id={tenantId} onSaved={onSaved} onClose={onClose} /> : <TenantForm onSaved={onSaved} onClose={onClose} />;
}

/** Edit mode: waits for the detail (the list has no idNumber), then shows the form. */
function EditTenant({ id, onSaved, onClose }: { id: string; onSaved?: (tenant: Tenant) => void; onClose: () => void }) {
  const tenant = useTenant(id);
  if (tenant.data) return <TenantForm tenant={tenant.data} onSaved={onSaved} onClose={onClose} />;
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title="Edit tenant"
      footer={<Button onClick={onClose}>Cancel</Button>}
    >
      {tenant.isError ? (
        <InlineError title="Couldn't load the tenant" description={errorText(tenant.error)} onRetry={() => void tenant.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}
    </Modal>
  );
}

function TenantForm({ tenant, onSaved, onClose }: { tenant?: TenantDetail; onSaved?: (tenant: Tenant) => void; onClose: () => void }) {
  const create = useCreateTenant();
  const update = useUpdateTenant();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TenantFormInput, unknown, TenantFormOutput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: tenantDefaults(tenant),
    mode: "onTouched",
  });

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      if (tenant) {
        const body = tenantChanges(v, tenant);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: tenant.id, body });
          toast.success(`Tenant ${saved.fullName} updated`);
          onSaved?.(saved);
        }
      } else {
        const saved = await create.mutateAsync(tenantCreateBody(v));
        toast.success(`Tenant ${saved.fullName} added`);
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      // 409 "A tenant with email ... already exists" belongs under Email.
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { type: "server", message: err.messages.join(". ") }, { shouldFocus: true });
        return;
      }
      setFormErrors(applyServerError(setError, err, TENANT_FIELDS));
    }
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={tenant ? "Edit tenant" : "Add tenant"}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="tenant-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Saving..." : tenant ? "Save changes" : "Add tenant"}
          </Button>
        </>
      }
    >
      <form id="tenant-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}

        <FormField label="Full name" htmlFor="tf-name" required error={errors.fullName?.message} className="md:col-span-2">
          <Input id="tf-name" autoFocus autoComplete="off" {...register("fullName")} />
        </FormField>
        <FormField label="Email" htmlFor="tf-email" help="Optional" error={errors.email?.message}>
          <Input id="tf-email" type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <FormField label="Phone" htmlFor="tf-phone" help="Optional" error={errors.phone?.message}>
          <Input id="tf-phone" type="tel" autoComplete="off" {...register("phone")} />
        </FormField>
        <FormField label="ID / passport number" htmlFor="tf-id" error={errors.idNumber?.message}>
          <Input id="tf-id" autoComplete="off" {...register("idNumber")} />
        </FormField>
        <FormField label="Tenant type" htmlFor="tf-type" required error={errors.tenantType?.message}>
          <Select id="tf-type" {...register("tenantType")}>
            {labelOptions(tenantTypeLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Address" htmlFor="tf-address" error={errors.address?.message} className="md:col-span-2">
          <Input id="tf-address" autoComplete="off" {...register("address")} />
        </FormField>
        <FormField label="Move-in date" htmlFor="tf-movein" error={errors.moveInDate?.message}>
          <Input id="tf-movein" type="date" {...register("moveInDate")} />
        </FormField>
        <FormField label="Preferred contact method" htmlFor="tf-contact" error={errors.preferredContactMethod?.message}>
          <Select id="tf-contact" {...register("preferredContactMethod")}>
            {labelOptions(contactMethodLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Notes" htmlFor="tf-notes" error={errors.notes?.message} className="md:col-span-2">
          <Textarea id="tf-notes" {...register("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}
