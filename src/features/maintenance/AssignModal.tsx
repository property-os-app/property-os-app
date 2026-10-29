import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Body, Button, Select } from "@/components/atoms";
import { FormField, InlineError, toast } from "@/components/molecules";
import { Modal } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { useTicketAction } from "@/features/maintenance/hooks";
import { ticketNo } from "@/features/maintenance/ticketText";
import { useTradeLabel, useVendors } from "@/features/vendors/hooks";
import { insuranceText } from "@/features/vendors/vendorText";
import type { MaintenanceTicket } from "@/types/maintenance";
import type { Vendor } from "@/types/vendor";

/** Amber note when the picked vendor's insurance has expired (assigning is still allowed). */
export function ExpiredInsuranceNote({ vendor }: { vendor: Vendor | undefined }) {
  if (!vendor || vendor.insuranceStatus !== "EXPIRED") return null;
  return (
    <div role="status" className="flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2.5 text-small text-warning">
      <AlertTriangle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <span>
        {vendor.name}'s insurance {insuranceText(vendor).replace(/^Expired/, "expired")}. You can still assign them; ask for a current certificate.
      </span>
    </div>
  );
}

/**
 * Assign or reassign a vendor (POST /assign { vendorId }). Lists active vendors only (archived → 409), without the current
 * assignee. An EXPIRED insurance shows a warning but doesn't block. Errors stay inside. Mount it only while open.
 */
export function AssignModal({ ticket, onClose }: { ticket: MaintenanceTicket; onClose: () => void }) {
  const vendors = useVendors();
  const tradeLabel = useTradeLabel();
  const action = useTicketAction();
  const [vendorId, setVendorId] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => (vendors.data ?? []).filter((v) => v.archivedAt === null && v.id !== ticket.vendorId), [vendors.data, ticket.vendorId]);
  const picked = options.find((v) => v.id === vendorId);
  const reassign = ticket.vendor !== null;
  const busy = action.isPending;

  const submit = () => {
    setError(null);
    if (!vendorId) return setFieldError("Choose a vendor.");
    setFieldError(null);
    action.mutate(
      { id: ticket.id, action: "assign", body: { vendorId } },
      {
        onSuccess: (saved) => {
          toast.success(`${ticketNo(saved)} ${reassign ? "reassigned" : "assigned"} to ${saved.vendor?.name ?? picked?.name ?? "the vendor"}`);
          onClose();
        },
        onError: (err) => {
          const vendorMessages = err instanceof ApiError ? err.messages.filter((m) => m.startsWith("Vendor ") || m.startsWith("vendorId")) : [];
          if (vendorMessages.length > 0) setFieldError(vendorMessages.join(". "));
          else setError(errorText(err));
        },
      },
    );
  };

  return (
    <Modal
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={`${reassign ? "Reassign" : "Assign"} ${ticketNo(ticket)}`}
      description={ticket.title}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} aria-busy={busy || undefined} onClick={submit}>
            {busy ? "Assigning..." : reassign ? "Reassign" : "Assign"}
          </Button>
        </>
      }
    >
      {reassign && (
        <Body className="m-0">
          Currently assigned to {ticket.vendor!.name}. The status stays {ticket.status === "IN_PROGRESS" ? "In progress" : "Assigned"}.
        </Body>
      )}
      {!reassign && ticket.status === "OPEN" && <Body className="m-0">The ticket moves to Assigned.</Body>}
      {error && <InlineError title={error} />}
      {vendors.isError && <InlineError title="Couldn't load vendors" description={errorText(vendors.error)} onRetry={() => void vendors.refetch()} />}
      <FormField
        label="Vendor"
        htmlFor="assign-vendor"
        required
        error={fieldError}
        help={vendors.isSuccess && options.length === 0 ? "No other active vendors. Add one on the Vendors page." : undefined}
      >
        <Select id="assign-vendor" autoFocus value={vendorId} disabled={busy} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">{vendors.isPending ? "Loading vendors..." : "Choose a vendor"}</option>
          {options.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · {tradeLabel(v.trade)}
              {v.insuranceStatus === "EXPIRED" ? " (insurance expired)" : ""}
            </option>
          ))}
        </Select>
      </FormField>
      <ExpiredInsuranceNote vendor={picked} />
    </Modal>
  );
}
