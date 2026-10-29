import { Plus } from "lucide-react";
import { Avatar, Caption, Skeleton, Small } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { OnTicketAction } from "@/features/maintenance/ticketMenu";
import { PriorityBadge, TicketMenu } from "@/features/maintenance/TicketParts";
import { ageText, closedText, locationLabel, slaHoursText, slaText, ticketNo } from "@/features/maintenance/ticketText";
import type { MaintenanceTicket } from "@/types/maintenance";

export interface TicketCardProps {
  ticket: MaintenanceTicket;
  onAction: OnTicketAction;
  /** For "Just now" / "2h ago" and the SLA text (one clock per board render). */
  now: Date;
}

/**
 * One board card: #1042 + priority + kebab; title (2 lines max); location; assignee avatar (a dashed "+" that opens Assign
 * when allowed); age and SLA ("SLA 4h", red with "Past SLA by 2h" once the server flags it); "est. $1,800.00" while active,
 * "Closed Oct 6 · $18.00" when resolved. Emergencies get a red border and left edge. The card opens the drawer.
 */
export function TicketCard({ ticket: t, onAction, now }: TicketCardProps) {
  const open = () => onAction("open", t);
  const sla = slaText(t, now);
  const slaHours = slaHoursText(t);
  const closed = t.status === "RESOLVED" ? closedText(t) : null;
  const emergency = t.priority === "EMERGENCY" && t.status !== "RESOLVED";

  return (
    <Card
      as="article"
      padding="compact"
      role="button"
      tabIndex={0}
      aria-label={`Open ${ticketNo(t)} ${t.title}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "flex min-w-0 cursor-pointer flex-col gap-2 p-4 transition-colors duration-fast hover:border-border-strong focus-visible:focus-ring",
        emergency && "border-danger border-l-4",
      )}
    >
      <div className="flex items-center gap-2">
        <Caption className="tabular">{ticketNo(t)}</Caption>
        <PriorityBadge priority={t.priority} />
        <div className="ml-auto -my-1.5">
          <TicketMenu ticket={t} onAction={onAction} />
        </div>
      </div>
      <div className="line-clamp-2 font-semibold text-text-primary" title={t.title}>
        {t.title}
      </div>
      <Small className="block truncate" title={locationLabel(t)}>
        {locationLabel(t)}
      </Small>
      <div className="flex min-w-0 items-center gap-2">
        {t.vendor ? (
          <Avatar name={t.vendor.name} size={24} />
        ) : t.allowedActions.assign ? (
          <button
            type="button"
            aria-label={`Assign a vendor to ${ticketNo(t)}`}
            onClick={(e) => {
              e.stopPropagation();
              onAction("assign", t);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="relative inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-text-muted hover:border-success hover:text-success focus-visible:focus-ring-tight before:absolute before:-inset-2.5 before:content-['']"
          >
            <Plus size={12} strokeWidth={2} />
          </button>
        ) : (
          <span
            aria-label="Unassigned"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-text-muted"
          >
            <Plus size={12} strokeWidth={2} />
          </span>
        )}
        <Caption className="min-w-0 truncate">{t.vendor ? t.vendor.name : "Unassigned"}</Caption>
        <Caption className="ml-auto shrink-0 whitespace-nowrap">{ageText(t.createdAt, now)}</Caption>
      </div>
      {(sla || slaHours || closed || t.estimatedCost) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {sla ? (
            <Caption className={cn("font-semibold", sla.tone === "danger" ? "text-danger" : "text-text-secondary")}>
              {slaHours ? `${slaHours} · ` : ""}
              {sla.label}
            </Caption>
          ) : (
            slaHours && t.status !== "RESOLVED" && t.status !== "CANCELLED" && <Caption>{slaHours}</Caption>
          )}
          {closed ? (
            <Caption className="tabular text-text-secondary">{closed}</Caption>
          ) : (
            t.estimatedCost && <Caption className="ml-auto tabular">est. {formatCurrency(t.estimatedCost)}</Caption>
          )}
        </div>
      )}
    </Card>
  );
}

/** Loading placeholder in the shape of a TicketCard. */
export function TicketCardSkeleton() {
  return (
    <Card padding="compact" className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-5 w-20 rounded-pill" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3.5 w-3/5" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </Card>
  );
}
