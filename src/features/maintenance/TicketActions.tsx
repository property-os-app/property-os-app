import { useRef, useState } from "react";
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
 * refetches); Edit, Assign, Resolve and Cancel open their modal (over the drawer when it is open). `options.onSettled(ok)`
 * reports the outcome: true once saved, false on an error or when the dialog is closed without saving (board drops snap
 * back on false). Render `dialogs` once.
 */
export function useTicketActions({ onOpen }: { onOpen: (t: MaintenanceTicket) => void }) {
  const [dialog, setDialog] = useState<{ kind: DialogKind; ticket: MaintenanceTicket; onSettled?: (ok: boolean) => void } | null>(null);
  // Whether the open dialog saved, so closing it reports true (saved) or false (cancelled) to onSettled.
  const saved = useRef(false);
  const action = useTicketAction();
  const { mutate, mutateAsync } = action;
  const close = () => {
    dialog?.onSettled?.(saved.current);
    setDialog(null);
  };
  const markSaved = () => {
    saved.current = true;
  };

  const run: OnTicketAction = (kind, t, options) => {
    const no = ticketNo(t);
    const settled = options?.onSettled;
    const onError = (err: unknown) => {
      toast.error(errorText(err));
      settled?.(false);
    };
    const done = (message: string) => {
      toast.success(message);
      settled?.(true);
    };
    switch (kind) {
      case "open":
        return onOpen(t);
      case "start":
        return mutate({ id: t.id, action: "start" }, { onSuccess: () => done(`${no} started`), onError });
      case "unassign":
        return mutate(
          { id: t.id, action: "unassign" },
          { onSuccess: () => done(t.vendor ? `${no} unassigned from ${t.vendor.name}` : `${no} unassigned`), onError },
        );
      case "reopen":
        return mutate(
          { id: t.id, action: "reopen" },
          { onSuccess: (s) => done(s.vendor ? `${no} reopened and assigned to ${s.vendor.name}` : `${no} reopened`), onError },
        );
      default:
        saved.current = false;
        return setDialog({ kind, ticket: t, onSettled: settled });
    }
  };

  const t = dialog?.ticket;
  const dialogs = t ? (
    <>
      {dialog.kind === "edit" && <TicketFormModal ticket={t} onSaved={markSaved} onClose={close} />}
      {dialog.kind === "assign" && <AssignModal ticket={t} onSaved={markSaved} onClose={close} />}
      {dialog.kind === "resolve" && <ResolveModal ticket={t} onSaved={markSaved} onClose={close} />}
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
            markSaved();
            toast.success(`${ticketNo(t)} cancelled`);
          }}
          onClose={close}
        />
      )}
    </>
  ) : null;

  return { run, dialogs, busy: action.isPending };
}
