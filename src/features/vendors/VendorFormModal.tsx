import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { applyServerErrorBy } from "@/lib/forms";
import { labelOptions, rateUnitLabels } from "@/lib/labels";
import { createVendorBody, vendorChanges, vendorDefaults, vendorErrorField, vendorSchema, type VendorFormInput, type VendorFormOutput } from "@/features/vendors/form";
import { useCreateVendor, useUpdateVendor, useVendorTrades } from "@/features/vendors/hooks";
import type { Vendor } from "@/types/vendor";

export interface VendorFormModalProps {
  /** Edit this vendor; without it the modal adds one. */
  vendor?: Vendor;
  onSaved?: (vendor: Vendor) => void;
  onClose: () => void;
}

/**
 * Add / edit vendor (vendors.manage). Trimmed text, rate amount and unit together (both or neither), PATCH with only the
 * changes. A name clash (409, also with an archived vendor: "Unarchive it instead.") shows under Name. Mount it only while open.
 */
export function VendorFormModal({ vendor, onSaved, onClose }: VendorFormModalProps) {
  const trades = useVendorTrades();
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<VendorFormInput, unknown, VendorFormOutput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendorDefaults(vendor),
    mode: "onTouched",
  });

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    try {
      if (vendor) {
        const body = vendorChanges(v, vendor);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: vendor.id, body });
          toast.success(`Vendor ${saved.name} updated`);
          onSaved?.(saved);
        }
      } else {
        const saved = await create.mutateAsync(createVendorBody(v));
        toast.success(`Vendor ${saved.name} added`);
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      setFormErrors(applyServerErrorBy(setError, err, vendorErrorField));
    }
  });

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={vendor ? "Edit vendor" : "Add vendor"}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="vendor-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Saving..." : vendor ? "Save changes" : "Add vendor"}
          </Button>
        </>
      }
    >
      <form id="vendor-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}
        {trades.isError && <InlineError title="Couldn't load the trades" onRetry={() => void trades.refetch()} className="md:col-span-2" />}

        <FormField label="Name" htmlFor="vf-name" required error={errors.name?.message}>
          <Input id="vf-name" autoFocus autoComplete="off" {...register("name")} />
        </FormField>
        <FormField label="Trade" htmlFor="vf-trade" required error={errors.trade?.message}>
          <Select id="vf-trade" {...register("trade")}>
            <option value="">{trades.isPending ? "Loading trades..." : "Choose a trade"}</option>
            {trades.data?.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Contact name" htmlFor="vf-contact" error={errors.contactName?.message}>
          <Input id="vf-contact" autoComplete="off" {...register("contactName")} />
        </FormField>
        <FormField label="Service area" htmlFor="vf-area" error={errors.serviceArea?.message} help="e.g. Downtown, North side">
          <Input id="vf-area" autoComplete="off" {...register("serviceArea")} />
        </FormField>
        <FormField label="Phone" htmlFor="vf-phone" error={errors.phone?.message}>
          <Input id="vf-phone" type="tel" autoComplete="off" {...register("phone")} />
        </FormField>
        <FormField label="Email" htmlFor="vf-email" error={errors.email?.message}>
          <Input id="vf-email" type="email" autoComplete="off" {...register("email")} />
        </FormField>
        <FormField label="Rate" htmlFor="vf-rate" error={errors.rateAmount?.message} help="Optional. Set the amount and the unit together.">
          <Controller
            control={control}
            name="rateAmount"
            render={({ field }) => <CurrencyInput id="vf-rate" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FormField>
        <FormField label="Per" htmlFor="vf-unit" error={errors.rateUnit?.message}>
          <Select id="vf-unit" {...register("rateUnit")}>
            <option value="">No rate</option>
            {labelOptions(rateUnitLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label.charAt(0).toUpperCase() + o.label.slice(1)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="License number" htmlFor="vf-license" error={errors.licenseNumber?.message} className="md:col-span-2">
          <Input id="vf-license" autoComplete="off" {...register("licenseNumber")} />
        </FormField>
        <FormField label="Insurance provider" htmlFor="vf-provider" error={errors.insuranceProvider?.message}>
          <Input id="vf-provider" autoComplete="off" {...register("insuranceProvider")} />
        </FormField>
        <FormField label="Policy number" htmlFor="vf-policy" error={errors.insurancePolicyNumber?.message}>
          <Input id="vf-policy" autoComplete="off" {...register("insurancePolicyNumber")} />
        </FormField>
        <FormField label="Insurance expires on" htmlFor="vf-expires" error={errors.insuranceExpiresOn?.message} help="Expiring and expired insurance sorts first.">
          <Input id="vf-expires" type="date" {...register("insuranceExpiresOn")} />
        </FormField>
        <FormField label="Notes" htmlFor="vf-notes" error={errors.notes?.message} className="md:col-span-2">
          <Textarea id="vf-notes" {...register("notes")} />
        </FormField>
      </form>
    </Modal>
  );
}
