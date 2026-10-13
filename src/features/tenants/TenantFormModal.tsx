import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Select, Skeleton, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { applyServerError } from "@/lib/forms";
import { contactMethodLabels, labelOptions, tenantTypeLabels } from "@/lib/labels";
import { useCreateTenant, useTenant, useUpdateTenant } from "@/features/tenants/hooks";
import type { ContactMethod, TenantCreateBody, TenantDetail, TenantType, TenantUpdateBody } from "@/types/tenant";

const TENANT_TYPES = Object.keys(tenantTypeLabels) as [TenantType, ...TenantType[]];
const CONTACT_METHODS = Object.keys(contactMethodLabels) as [ContactMethod, ...ContactMethod[]];

const FIELDS = ["fullName", "email", "phone", "idNumber", "address", "tenantType", "moveInDate", "preferredContactMethod", "notes"] as const;

/** Rules from docs/rules.md (Tenants). Every text field is trimmed before it is checked and sent. */
const schema = z.object({
  fullName: z.string().trim().min(1, "Enter the full name."),
  email: z.string().trim().min(1, "Enter the email.").pipe(z.email("Enter a valid email, e.g. name@example.com.")),
  phone: z.string().trim().min(1, "Enter the phone number."),
  idNumber: z.string().trim(),
  address: z.string().trim(),
  tenantType: z.enum(TENANT_TYPES),
  // Input type="date" gives "" or "YYYY-MM-DD"; the string is kept as it is.
  moveInDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a full date."),
  preferredContactMethod: z.enum(CONTACT_METHODS),
  notes: z.string().trim(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function defaults(t?: TenantDetail): FormInput {
  return {
    fullName: t?.fullName ?? "",
    email: t?.email ?? "",
    phone: t?.phone ?? "",
    idNumber: t?.idNumber ?? "",
    address: t?.address ?? "",
    tenantType: t?.tenantType ?? "INDIVIDUAL",
    // The API sends a full timestamp ("2026-03-01T00:00:00.000Z"): keep the date part.
    moveInDate: t?.moveInDate?.slice(0, 10) ?? "",
    preferredContactMethod: t?.preferredContactMethod ?? "EMAIL",
    notes: t?.notes ?? "",
  };
}

/** POST body: optional fields only when filled. */
function createBody(v: FormOutput): TenantCreateBody {
  return {
    fullName: v.fullName,
    email: v.email,
    phone: v.phone,
    tenantType: v.tenantType,
    preferredContactMethod: v.preferredContactMethod,
    ...(v.idNumber ? { idNumber: v.idNumber } : {}),
    ...(v.address ? { address: v.address } : {}),
    ...(v.moveInDate ? { moveInDate: v.moveInDate } : {}),
    ...(v.notes ? { notes: v.notes } : {}),
  };
}

/** PATCH body with only the changed fields. idNumber, address, moveInDate, notes: null when the user cleared them. */
function changedFields(v: FormOutput, t: TenantDetail): TenantUpdateBody {
  const before = defaults(t);
  const body: TenantUpdateBody = {};
  if (v.fullName !== before.fullName) body.fullName = v.fullName;
  if (v.email !== before.email) body.email = v.email;
  if (v.phone !== before.phone) body.phone = v.phone;
  if (v.tenantType !== before.tenantType) body.tenantType = v.tenantType;
  if (v.preferredContactMethod !== before.preferredContactMethod) body.preferredContactMethod = v.preferredContactMethod;
  if (v.idNumber !== before.idNumber) body.idNumber = v.idNumber || null;
  if (v.address !== before.address) body.address = v.address || null;
  if (v.moveInDate !== before.moveInDate) body.moveInDate = v.moveInDate || null;
  if (v.notes !== before.notes) body.notes = v.notes || null;
  return body;
}

export interface TenantFormModalProps {
  /** Edit this tenant (loads GET /tenants/:id for the idNumber); without it the modal creates one. */
  tenantId?: string;
  onClose: () => void;
}

/** Add / edit tenant modal (OWNER and managers). Mount it only while open. */
export function TenantFormModal({ tenantId, onClose }: TenantFormModalProps) {
  return tenantId ? <EditTenant id={tenantId} onClose={onClose} /> : <TenantForm onClose={onClose} />;
}

/** Edit mode: waits for the detail (the list has no idNumber), then shows the form. */
function EditTenant({ id, onClose }: { id: string; onClose: () => void }) {
  const tenant = useTenant(id);
  if (tenant.data) return <TenantForm tenant={tenant.data} onClose={onClose} />;
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

function TenantForm({ tenant, onClose }: { tenant?: TenantDetail; onClose: () => void }) {
  const create = useCreateTenant();
  const update = useUpdateTenant();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaults(tenant),
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
        const body = changedFields(v, tenant);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: tenant.id, body });
          toast.success(`Tenant ${saved.fullName} updated`);
        }
      } else {
        const saved = await create.mutateAsync(createBody(v));
        toast.success(`Tenant ${saved.fullName} added`);
      }
      onClose();
    } catch (err) {
      // 409 "A tenant with email ... already exists" belongs under Email.
      if (err instanceof ApiError && err.status === 409) {
        setError("email", { type: "server", message: err.messages.join(". ") }, { shouldFocus: true });
        return;
      }
      setFormErrors(applyServerError(setError, err, FIELDS));
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
        <FormField label="Email" htmlFor="tf-email" required error={errors.email?.message}>
          <Input id="tf-email" type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <FormField label="Phone" htmlFor="tf-phone" required error={errors.phone?.message}>
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
