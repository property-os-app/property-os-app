/** Ticket actions for menus and buttons: kinds, labels, icons and the allowed list (from each ticket's allowedActions). */
import { CheckCircle2, Pencil, Play, RotateCcw, UserMinus, UserPlus, XCircle } from "lucide-react";
import type { MenuItem } from "@/components/molecules";
import type { MaintenanceTicket } from "@/types/maintenance";

/** What a ticket button or menu item asks the page to do. "open" opens the drawer. */
export type TicketActionKind = "open" | "edit" | "assign" | "unassign" | "start" | "resolve" | "reopen" | "cancel";
export type OnTicketAction = (kind: TicketActionKind, ticket: MaintenanceTicket) => void;

const icon = { size: 16, strokeWidth: 1.5 } as const;

/** Button / menu label per action. Assign reads "Reassign" when the ticket already has a vendor. */
export function actionLabel(kind: Exclude<TicketActionKind, "open">, t: MaintenanceTicket): string {
  switch (kind) {
    case "edit":
      return t.status === "RESOLVED" ? "Edit resolution" : "Edit";
    case "assign":
      return t.vendor ? "Reassign" : "Assign vendor";
    case "unassign":
      return "Unassign";
    case "start":
      return "Start work";
    case "resolve":
      return "Resolve";
    case "reopen":
      return "Reopen";
    case "cancel":
      return "Cancel ticket";
  }
}

const icons = {
  edit: <Pencil {...icon} />,
  assign: <UserPlus {...icon} />,
  unassign: <UserMinus {...icon} />,
  start: <Play {...icon} />,
  resolve: <CheckCircle2 {...icon} />,
  reopen: <RotateCcw {...icon} />,
  cancel: <XCircle {...icon} />,
};

/** Order of the actions in a menu (cancel last, red). */
const MENU_ORDER = ["assign", "start", "resolve", "reopen", "unassign", "edit", "cancel"] as const;

/** The actions the caller may take now (from allowedActions), in menu order. */
export function allowedKinds(t: MaintenanceTicket): (typeof MENU_ORDER)[number][] {
  return MENU_ORDER.filter((k) => t.allowedActions[k]);
}

/** Kebab items for a ticket: the allowed actions, optionally "Open" first. */
export function ticketMenuItems(t: MaintenanceTicket, onAction: OnTicketAction, kinds = allowedKinds(t)): MenuItem[] {
  return kinds.map((k) => ({ label: actionLabel(k, t), icon: icons[k], destructive: k === "cancel", onSelect: () => onAction(k, t) }));
}
