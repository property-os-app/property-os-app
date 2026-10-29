import { useState } from "react";
import { toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { ReasonModal } from "@/features/expenses/ReasonModal";
import { AssignModal } from "@/features/maintenance/AssignModal";
import { useTicketAction } from "@/features/maintenance/hooks";
import { ResolveModal } from "@/features/maintenance/ResolveModal";
import { TicketFormModal } from "@/features/maintenance/TicketFormModal";
import type { OnTicketAction, TicketActionKind } from "@/features/maintenance/ticketMenu";
import { ticketNo } from "@/features/maintenance/ticketText";
import type { MaintenanceTicket } from "@/types/maintenance";

type DialogKind = Extract<TicketActionKind, "edit" | "assign" | "resolve" | "cancel">;

/**
 * One place that runs a ticket action, for the board cards, table rows and the drawer: "open" calls `onOpen`; Unassign,
 * Start and Reopen run at once (toast, or the backend message on error, e.g. a 409 after someone else changed it, which also
 * refetches); Edit, Assign, Resolve and Cancel open their modal (over the drawer when it is open). Render `dialogs` once.
 */
export function useTicketActions({ onOpen }: { onOpen: (t: MaintenanceTicket) => void }) {
  const [dialog, setDialog] = useState<{ kind: DialogKind; ticket: MaintenanceTicket } | null>(null);
  const action = useTicketAction();
  const { mutate, mutateAsync } = action;
  const close = () => setDialog(null);

  const run: OnTicketAction = (kind, t) => {
    const no = ticketNo(t);
    const onError = (err: unknown) => toast.error(errorText(err));
    switch (kind) {
      case "open":
        return onOpen(t);
      case "start":
        return mutate({ id: t.id, action: "start" }, { onSuccess: () => toast.success(`${no} started`), onError });
      case "unassign":
        return mutate(
          { id: t.id, action: "unassign" },
          { onSuccess: () => toast.success(t.vendor ? `${no} unassigned from ${t.vendor.name}` : `${no} unassigned`), onError },
        );
      case "reopen":
        return mutate(
          { id: t.id, action: "reopen" },
          { onSuccess: (saved) => toast.success(saved.vendor ? `${no} reopened and assigned to ${saved.vendor.name}` : `${no} reopened`), onError },
        );
      default:
        return setDialog({ kind, ticket: t });
    }
  };

  const t = dialog?.ticket;
  const dialogs = t ? (
    <>
      {dialog.kind === "edit" && <TicketFormModal ticket={t} onClose={close} />}
      {dialog.kind === "assign" && <AssignModal ticket={t} onClose={close} />}
      {dialog.kind === "resolve" && <ResolveModal ticket={t} onClose={close} />}
      {dialog.kind === "cancel" && (
        <ReasonModal
          title={`Cancel ${ticketNo(t)}?`}
          description={t.title}
          intro="Cancelling is final: the ticket can't be reopened or changed afterwards. Linked expenses stay as they are."
          confirmLabel="Cancel ticket"
          busyLabel="Cancelling..."
          danger
          onConfirm={async (reason) => {
            await mutateAsync({ id: t.id, action: "cancel", body: { reason } });
            toast.success(`${ticketNo(t)} cancelled`);
          }}
          onClose={close}
        />
      )}
    </>
  ) : null;

  return { run, dialogs, busy: action.isPending };
}
