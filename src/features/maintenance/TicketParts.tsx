import { Badge } from "@/components/atoms";
import { KebabMenu, StatusBadge } from "@/components/molecules";
import { ticketMenuItems, type OnTicketAction } from "@/features/maintenance/ticketMenu";
import type { MaintenancePriority, MaintenanceTicket } from "@/types/maintenance";

/** The "⋮" menu on a card or row; nothing when no action is allowed. */
export function TicketMenu({ ticket, onAction }: { ticket: MaintenanceTicket; onAction: OnTicketAction }) {
  const items = ticketMenuItems(ticket, onAction);
  return items.length > 0 ? <KebabMenu label={`Actions for #${ticket.ticketNumber}`} items={items} /> : null;
}

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return <StatusBadge domain="priority" status={priority} />;
}

/** The status badge, plus "Past SLA" while the server says so. */
export function TicketStatusBadges({ ticket }: { ticket: MaintenanceTicket }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge domain="ticket" status={ticket.status} />
      {ticket.sla.pastSla && <StatusBadge domain="ticket" status="PAST_SLA" />}
    </span>
  );
}

/** A linked expense's state: its approval status, or "Voided". */
export function TicketExpenseBadge({ status, voided }: { status: MaintenanceTicket["expenses"][number]["status"]; voided: boolean }) {
  return voided ? <Badge tone="neutral">Voided</Badge> : <StatusBadge domain="approval" status={status} />;
}
