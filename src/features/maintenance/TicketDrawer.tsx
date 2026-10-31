import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, CirclePlus, Play, UserPlus, Wrench, XCircle } from "lucide-react";
import { Button, Caption, Dash, H3, Skeleton, Small } from "@/components/atoms";
import { Card, EmptyState, InlineError, KebabMenu, KeyValueList, TimelineItem, type TimelineTone } from "@/components/molecules";
import { Drawer } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { linkFocus } from "@/features/shared/linkClass";
import { RatingStars } from "@/features/shared/Rating";
import { useTicket } from "@/features/maintenance/hooks";
import { actionLabel, allowedKinds, ticketMenuItems, type OnTicketAction } from "@/features/maintenance/ticketMenu";
import { PriorityBadge, TicketExpenseBadge, TicketStatusBadges } from "@/features/maintenance/TicketParts";
import { locationLabel, slaText, ticketNo, timestampText } from "@/features/maintenance/ticketText";
import { useTradeLabel } from "@/features/vendors/hooks";
import type { MaintenanceTicket } from "@/types/maintenance";

export interface TicketDrawerProps {
  id: string;
  /** The board card or table row, shown until GET /maintenance-tickets/:id answers. */
  placeholder?: MaintenanceTicket;
  onAction: OnTicketAction;
  onClose: () => void;
}

/** The main button for the status: Resolve while in progress, Start once assigned, Assign while open, Reopen once resolved. */
function primaryKind(t: MaintenanceTicket) {
  const order = { IN_PROGRESS: "resolve", ASSIGNED: "start", OPEN: "assign", RESOLVED: "reopen", CANCELLED: null } as const;
  const kind = order[t.status];
  return kind && t.allowedActions[kind] ? kind : null;
}

/** Buttons shown next to the primary; the rest of the allowed actions go in the footer's "⋮" menu. */
const BUTTON_KINDS = ["assign", "start", "resolve", "edit"] as const;

/**
 * One ticket (lg drawer): details, SLA, assignee, costs with the linked expenses (each opens on the Expenses page), and a
 * timeline from the timestamps (created, assigned, started, resolved with the note and rating, or cancelled with the
 * reason). Footer from allowedActions: the main action for the status, a few buttons, the rest in a menu. Modals open
 * over it. Mount it only while open.
 */
export function TicketDrawer({ id, placeholder, onAction, onClose }: TicketDrawerProps) {
  const detail = useTicket(id, placeholder);
  const tradeLabel = useTradeLabel();
  const navigate = useNavigate();
  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  const t = notFound ? undefined : detail.data;

  const footer = t ? <Footer ticket={t} onAction={onAction} /> : undefined;
  const sla = t ? slaText(t) : null;

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={t ? t.title : notFound ? "Ticket not found" : "Loading ticket"}
      description={t ? `${ticketNo(t)} · ${locationLabel(t)}` : undefined}
      status={
        t ? (
          <span className="inline-flex flex-wrap gap-1.5">
            <PriorityBadge priority={t.priority} />
            <TicketStatusBadges ticket={t} />
          </span>
        ) : undefined
      }
      footer={footer}
    >
      {notFound ? (
        <Card padding="none">
          <EmptyState
            icon={<Wrench strokeWidth={1.5} />}
            title="Ticket not found"
            description="This ticket doesn't exist, or it's on a property you can't see."
          />
        </Card>
      ) : !t ? (
        detail.isError ? (
          <InlineError title="Couldn't load the ticket" description={errorText(detail.error)} onRetry={() => void detail.refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </div>
        )
      ) : (
        <>
          {detail.isError && <InlineError title="Couldn't refresh the ticket" description={errorText(detail.error)} onRetry={() => void detail.refetch()} />}
          <div className="flex flex-col gap-3">
            <H3>Details</H3>
            <KeyValueList
              labelWidth={140}
              items={[
                { label: "Property", value: t.property.name },
                { label: "Location", value: [t.unit ? `Unit ${t.unit.unitNumber}` : null, t.locationNote].filter(Boolean).join(" · ") || <Dash /> },
                {
                  label: "SLA",
                  value: sla ? (
                    <span className={cn(sla.tone === "danger" && "font-semibold text-danger")}>
                      {sla.label}
                      <Caption className="block">
                        {t.sla.hours}h from creation, due {timestampText(t.sla.dueAt!)}
                      </Caption>
                    </span>
                  ) : t.sla.hours ? (
                    `${t.sla.hours}h (stopped)`
                  ) : (
                    "No SLA for this priority"
                  ),
                },
                {
                  label: "Assignee",
                  value: t.vendor ? (
                    <span>
                      {t.vendor.name}
                      <Caption className="block">{tradeLabel(t.vendor.trade)}</Caption>
                    </span>
                  ) : (
                    <span className="text-text-secondary">Unassigned</span>
                  ),
                },
                { label: "Description", value: t.description ? <span className="whitespace-pre-line">{t.description}</span> : <Dash /> },
              ]}
            />
          </div>

          <Card padding="compact" className="flex flex-col gap-3">
            <H3>Costs</H3>
            <KeyValueList
              labelWidth={140}
              items={[
                { label: "Estimated", value: t.estimatedCost ? <span className="tabular">{formatCurrency(t.estimatedCost)}</span> : <Dash /> },
                {
                  label: "Actual",
                  value: t.actualCost ? (
                    <span>
                      <span className="font-semibold tabular">{formatCurrency(t.actualCost)}</span>
                      <Caption className="block">From linked expenses, pending ones included; voided and rejected ones aren't counted.</Caption>
                    </span>
                  ) : (
                    <Dash />
                  ),
                },
              ]}
            />
            {t.expenses.length > 0 && (
              <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0" aria-label="Linked expenses">
                {t.expenses.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => void navigate(`/expenses?expense=${encodeURIComponent(e.id)}`)}
                      className={cn("flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-left hover:bg-surface-3 max-md:min-h-11", linkFocus)}
                    >
                      <span className="font-semibold text-success">{e.expenseNumber}</span>
                      <TicketExpenseBadge status={e.status} voided={e.voided} />
                      <span className={cn("ml-auto tabular", e.voided && "text-text-muted line-through")}>{formatCurrency(e.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex flex-col gap-1">
            <H3>History</H3>
            <Timeline ticket={t} />
          </div>
        </>
      )}
    </Drawer>
  );
}

function Footer({ ticket: t, onAction }: { ticket: MaintenanceTicket; onAction: OnTicketAction }) {
  const primary = primaryKind(t);
  const buttons = BUTTON_KINDS.filter((k) => k !== primary && t.allowedActions[k]);
  const menu = allowedKinds(t).filter((k) => k !== primary && !(buttons as readonly string[]).includes(k));
  if (!primary && buttons.length === 0 && menu.length === 0) return null;
  return (
    <>
      {menu.length > 0 && <KebabMenu label="More actions" items={ticketMenuItems(t, onAction, menu)} />}
      {buttons.map((k) => (
        <Button key={k} onClick={() => onAction(k, t)}>
          {actionLabel(k, t)}
        </Button>
      ))}
      {primary && (
        <Button variant="primary" onClick={() => onAction(primary, t)}>
          {actionLabel(primary, t)}
        </Button>
      )}
    </>
  );
}

interface Event {
  at: string;
  icon: ReactNode;
  tone: TimelineTone;
  title: ReactNode;
  body?: ReactNode;
}

/** Events from the timestamps, oldest first. A reopen clears startedAt and the resolution, so only the current ones show. */
function Timeline({ ticket: t }: { ticket: MaintenanceTicket }) {
  const events: Event[] = [{ at: t.createdAt, icon: <CirclePlus />, tone: "neutral", title: `Created by ${t.createdBy.name}` }];
  if (t.assignedAt && t.vendor) events.push({ at: t.assignedAt, icon: <UserPlus />, tone: "warning", title: `Assigned to ${t.vendor.name}` });
  if (t.startedAt) events.push({ at: t.startedAt, icon: <Play />, tone: "info", title: "Work started" });
  if (t.resolvedAt)
    events.push({
      at: t.resolvedAt,
      icon: <CheckCircle2 />,
      tone: "success",
      title: `Resolved${t.resolvedBy ? ` by ${t.resolvedBy.name}` : ""}`,
      body: (
        <>
          {t.vendorRating !== null && <RatingStars value={t.vendorRating} className="mt-1" />}
          {t.resolutionNote && <Small className="mt-1 block whitespace-pre-line">{t.resolutionNote}</Small>}
        </>
      ),
    });
  if (t.cancelledAt)
    events.push({
      at: t.cancelledAt,
      icon: <XCircle />,
      tone: "danger",
      title: `Cancelled${t.cancelledBy ? ` by ${t.cancelledBy.name}` : ""}`,
      body: t.cancelReason ? <Small className="mt-1 block whitespace-pre-line">{t.cancelReason}</Small> : undefined,
    });
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div>
      {events.map((e, i) => (
        <TimelineItem key={i} icon={e.icon} tone={e.tone} meta={timestampText(e.at)}>
          <span className="font-semibold">{e.title}</span>
          {e.body}
        </TimelineItem>
      ))}
    </div>
  );
}
