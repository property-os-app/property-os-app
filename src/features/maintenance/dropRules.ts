/** What dropping a board card on a column does, from the ticket's status and allowedActions (unit-tested). */
import type { BoardColumn } from "@/features/maintenance/ticketQuery";
import { ticketNo } from "@/features/maintenance/ticketText";
import type { MaintenanceTicket } from "@/types/maintenance";

/** start, unassign and reopen run at once; assign and resolve open their dialog. */
export type DropKind = "start" | "unassign" | "reopen" | "assign" | "resolve";

export type DropResult =
  /** Same column: nothing happens. */
  | { type: "none" }
  /** The column refuses the card; `message` is the toast. */
  | { type: "blocked"; message: string }
  /** `lands`: the column the card shows in while it runs (a reopen lands where the backend will put it). */
  | { type: "move"; kind: DropKind; lands: BoardColumn };

/** Where a reopened ticket goes: Assigned with a vendor, else Open (API.md, reopen). */
export function reopenColumn(t: Pick<MaintenanceTicket, "vendorId">): BoardColumn {
  return t.vendorId ? "ASSIGNED" : "OPEN";
}

/**
 * The drop rules. Only what allowedActions allows (it covers permissions and status); everything else is blocked with a
 * short reason. Cancel is never a drop. In progress can't go back to Open (unassign keeps it in progress), and Assign on an
 * in-progress ticket keeps it in progress, so neither is a drop onto Open / Assigned.
 */
export function dropResult(t: MaintenanceTicket, to: BoardColumn): DropResult {
  const from = t.status;
  if (from === to) return { type: "none" };
  const no = ticketNo(t);
  const a = t.allowedActions;
  const denied = (what: string) => ({ type: "blocked" as const, message: `You can't ${what} ${no}.` });

  if (from === "CANCELLED") return { type: "blocked", message: `${no} is cancelled and can't be moved.` };

  if (from === "RESOLVED") {
    if (to === "OPEN" || to === "ASSIGNED") return a.reopen ? { type: "move", kind: "reopen", lands: reopenColumn(t) } : denied("reopen");
    return { type: "blocked", message: `Reopen ${no} first, then start it.` };
  }

  switch (to) {
    case "IN_PROGRESS":
      return a.start ? { type: "move", kind: "start", lands: "IN_PROGRESS" } : denied("start");
    case "RESOLVED":
      return a.resolve ? { type: "move", kind: "resolve", lands: "RESOLVED" } : denied("resolve");
    case "ASSIGNED":
      if (from === "IN_PROGRESS") return { type: "blocked", message: `In-progress tickets stay in progress. Use Reassign in the ${no} menu.` };
      return a.assign ? { type: "move", kind: "assign", lands: "ASSIGNED" } : denied("assign");
    case "OPEN":
      if (from === "IN_PROGRESS") return { type: "blocked", message: `In-progress tickets can't go back to Open.` };
      return a.unassign ? { type: "move", kind: "unassign", lands: "OPEN" } : denied("unassign");
  }
}

/** The columns the card can be dropped on (for the highlight while dragging). */
export function dropTargets(t: MaintenanceTicket, columns: readonly BoardColumn[]): BoardColumn[] {
  return columns.filter((c) => dropResult(t, c).type === "move");
}
