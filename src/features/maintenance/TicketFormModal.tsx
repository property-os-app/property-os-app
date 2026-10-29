import { useId, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CurrencyInput, Input, Select, Textarea } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { applyServerErrorBy } from "@/lib/forms";
import { labelOptions, priorityLabels } from "@/lib/labels";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { RatingInput } from "@/features/shared/Rating";
import { useUnits } from "@/features/units/hooks";
import { useTradeLabel, useVendors } from "@/features/vendors/hooks";
import { ExpiredInsuranceNote } from "@/features/maintenance/AssignModal";
import {
  createTicketBody,
  LOCATION_SUGGESTIONS,
  resolutionChanges,
  ticketChanges,
  ticketDefaults,
  ticketErrorField,
  ticketSchema,
  type TicketFormInput,
  type TicketFormOutput,
} from "@/features/maintenance/form";
import { useCreateTicket, useUpdateTicket } from "@/features/maintenance/hooks";
import { ticketNo } from "@/features/maintenance/ticketText";
import type { MaintenanceTicket } from "@/types/maintenance";

export interface TicketFormModalProps {
  /** Edit this ticket (only when its allowedActions.edit); without it the modal adds a new one. */
  ticket?: MaintenanceTicket;
  onSaved?: (ticket: MaintenanceTicket) => void;
  onClose: () => void;
}

/** Add a ticket, edit an active one, or (RESOLVED) edit only its resolution note and rating. Mount it only while open. */
export function TicketFormModal(props: TicketFormModalProps) {
  return props.ticket?.status === "RESOLVED" ? (
    <ResolutionForm ticket={props.ticket} onSaved={props.onSaved} onClose={props.onClose} />
  ) : (
    <TicketForm {...props} />
  );
}

/**
 * Title, description, property, unit (the property's units; reset when the property changes), location note (with
 * suggestions), priority, vendor (add only: the ticket then starts Assigned; active vendors, expired insurance warned),
 * estimated cost. On edit only changes are sent; property and unit are locked once expenses are linked; the vendor and
 * status change through the action buttons. Backend messages under their field or at the top.
 */
function TicketForm({ ticket, onSaved, onClose }: TicketFormModalProps) {
  const { propertyId: scope } = useScope();
  const properties = useProperties();
  const units = useUnits();
  const vendors = useVendors();
  const tradeLabel = useTradeLabel();
  const create = useCreateTicket();
  const update = useUpdateTicket();
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const listId = useId();
  const locked = (ticket?.expenses.length ?? 0) > 0;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TicketFormInput, unknown, TicketFormOutput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: ticketDefaults(ticket, scope),
    mode: "onTouched",
  });

  const propertyId = useWatch({ control, name: "propertyId" });
  const vendorId = useWatch({ control, name: "vendorId" });
  const unitOptions = useMemo(() => (units.data ?? []).filter((u) => u.propertyId === propertyId), [units.data, propertyId]);
  const vendorOptions = useMemo(() => (vendors.data ?? []).filter((v) => v.archivedAt === null), [vendors.data]);

  const confirmClose = () => !isDirty || window.confirm("Discard changes?");
  const requestClose = () => {
    if (confirmClose()) onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormErrors([]);
    if (!locked && !v.propertyId) {
      setError("propertyId", { type: "required", message: "Choose a property." }, { shouldFocus: true });
      return;
    }
    try {
      if (ticket) {
        const body = ticketChanges(v, ticket);
        if (Object.keys(body).length > 0) {
          const saved = await update.mutateAsync({ id: ticket.id, body });
          toast.success(`${ticketNo(saved)} updated`);
          onSaved?.(saved);
        }
      } else {
        const saved = await create.mutateAsync(createTicketBody(v));
        toast.success(saved.vendor ? `${ticketNo(saved)} added and assigned to ${saved.vendor.name}` : `${ticketNo(saved)} added`);
        onSaved?.(saved);
      }
      onClose();
    } catch (err) {
      setFormErrors(applyServerErrorBy(setError, err, ticketErrorField));
    }
  });

  const loadError = [properties, units, vendors].find((q) => q.isError);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      confirmClose={confirmClose}
      size="lg"
      title={ticket ? `Edit ${ticketNo(ticket)}` : "Add ticket"}
      footer={
        <>
          <Button onClick={requestClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="ticket-form" variant="primary" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? "Saving..." : ticket ? "Save changes" : "Add ticket"}
          </Button>
        </>
      }
    >
      <form id="ticket-form" onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {formErrors.length > 0 && <InlineError title={formErrors.join(". ")} className="md:col-span-2" />}
        {loadError && <InlineError title="Couldn't load the form's lists" description="Close and reopen to try again." className="md:col-span-2" />}

        <FormField label="Title" htmlFor="tf-title" required error={errors.title?.message} className="md:col-span-2">
          <Input id="tf-title" autoFocus autoComplete="off" maxLength={150} placeholder="e.g. Kitchen sink leaking" {...register("title")} />
        </FormField>
        <FormField label="Description" htmlFor="tf-description" error={errors.description?.message} className="md:col-span-2">
          <Textarea id="tf-description" maxLength={2000} {...register("description")} />
        </FormField>
        <FormField
          label="Property"
          htmlFor="tf-property"
          required
          error={errors.propertyId?.message}
          help={locked ? "Locked: this ticket has expenses, which follow its property." : undefined}
        >
          <Select id="tf-property" disabled={locked} {...register("propertyId", { onChange: () => setValue("unitId", "", { shouldDirty: true }) })}>
            <option value="">{properties.isPending ? "Loading properties..." : "Choose a property"}</option>
            {properties.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Unit"
          htmlFor="tf-unit"
          error={errors.unitId?.message}
          help={locked ? "Locked: this ticket has expenses." : propertyId ? "Optional. Leave empty for a common area." : "Choose a property first."}
        >
          <Select id="tf-unit" disabled={locked || !propertyId} {...register("unitId")}>
            <option value="">{units.isPending ? "Loading units..." : "No unit"}</option>
            {unitOptions.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Location note" htmlFor="tf-location" error={errors.locationNote?.message} help='Optional, e.g. "Common area", "Exterior", "Kitchen".'>
          <Input id="tf-location" autoComplete="off" maxLength={100} list={listId} {...register("locationNote")} />
        </FormField>
        <datalist id={listId}>
          {LOCATION_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <FormField label="Priority" htmlFor="tf-priority" required error={errors.priority?.message} help="Emergency: 4h SLA · Urgent: 24h.">
          <Select id="tf-priority" {...register("priority")}>
            {labelOptions(priorityLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        {!ticket && (
          <FormField
            label="Vendor"
            htmlFor="tf-vendor"
            error={errors.vendorId?.message}
            help={vendorId ? "The ticket starts as Assigned." : "Optional. Assign later from the ticket."}
          >
            <Select id="tf-vendor" {...register("vendorId")}>
              <option value="">{vendors.isPending ? "Loading vendors..." : "No vendor yet"}</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {tradeLabel(v.trade)}
                  {v.insuranceStatus === "EXPIRED" ? " (insurance expired)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Estimated cost" htmlFor="tf-estimate" error={errors.estimatedCost?.message} help="Optional.">
          <Controller
            control={control}
            name="estimatedCost"
            render={({ field }) => <CurrencyInput id="tf-estimate" name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FormField>
        {!ticket && vendorId && (
          <div className="md:col-span-2">
            <ExpiredInsuranceNote vendor={vendorOptions.find((v) => v.id === vendorId)} />
          </div>
        )}
      </form>
    </Modal>
  );
}

/** A RESOLVED ticket accepts only the resolution note and the vendor rating (the rating only when it has a vendor). */
function ResolutionForm({ ticket, onSaved, onClose }: { ticket: MaintenanceTicket; onSaved?: (t: MaintenanceTicket) => void; onClose: () => void }) {
  const update = useUpdateTicket();
  const [note, setNote] = useState(ticket.resolutionNote ?? "");
  const [rating, setRating] = useState<number | null>(ticket.vendorRating);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const busy = update.isPending;
  const dirty = note !== (ticket.resolutionNote ?? "") || rating !== ticket.vendorRating;
  const confirmClose = () => !dirty || window.confirm("Discard changes?");

  const save = () => {
    setError(null);
    if (note.trim().length > 2000) return setFieldError("Keep the note under 2,000 characters.");
    setFieldError(null);
    const body = resolutionChanges({ resolutionNote: note, vendorRating: rating }, ticket);
    if (Object.keys(body).length === 0) return onClose();
    update.mutate(
      { id: ticket.id, body },
      {
        onSuccess: (saved) => {
          toast.success(`${ticketNo(saved)} resolution updated`);
          onSaved?.(saved);
          onClose();
        },
        onError: (err) => {
          const noteMessages = err instanceof ApiError ? err.messages.filter((m) => m.startsWith("resolutionNote")) : [];
          if (noteMessages.length > 0) setFieldError(noteMessages.join(". "));
          else setError(errorText(err));
        },
      },
    );
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      confirmClose={confirmClose}
      title={`Edit resolution of ${ticketNo(ticket)}`}
      description="A resolved ticket keeps its details. Reopen it to change anything else."
      footer={
        <>
          <Button disabled={busy} onClick={() => confirmClose() && onClose()}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} aria-busy={busy || undefined} onClick={save}>
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </>
      }
    >
      {error && <InlineError title={error} />}
      <FormField label="Resolution note" htmlFor="rf-note" error={fieldError}>
        <Textarea id="rf-note" autoFocus maxLength={2000} value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      {ticket.vendor && (
        <FormField
          label={<span id="rf-rating-label">Rating for {ticket.vendor.name}</span>}
          action={
            rating !== null ? (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRating(null)}>
                Clear
              </Button>
            ) : undefined
          }
        >
          <RatingInput aria-labelledby="rf-rating-label" value={rating} disabled={busy} onChange={setRating} />
        </FormField>
      )}
    </Modal>
  );
}
