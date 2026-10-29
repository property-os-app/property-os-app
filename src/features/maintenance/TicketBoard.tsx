import { useState, type DragEvent } from "react";
import { useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Caption, Count, Small } from "@/components/atoms";
import { InlineError, Tabs, toast } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { textLink } from "@/features/shared/linkClass";
import { dropResult, dropTargets } from "@/features/maintenance/dropRules";
import { maintenanceKeys } from "@/features/maintenance/keys";
import { TicketCard, TicketCardSkeleton, type TicketCardProps } from "@/features/maintenance/TicketCard";
import type { OnTicketAction } from "@/features/maintenance/ticketMenu";
import { BOARD_COLUMNS, type BoardColumn } from "@/features/maintenance/ticketQuery";
import type { MaintenanceTicket, TicketList } from "@/types/maintenance";

const columnLabels: Record<BoardColumn, string> = { OPEN: "Open", ASSIGNED: "Assigned", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };

const emptyText: Record<BoardColumn, string> = {
  OPEN: "No open tickets",
  ASSIGNED: "Nothing assigned",
  IN_PROGRESS: "Nothing in progress",
  RESOLVED: "Nothing resolved this week",
};

export interface TicketBoardProps {
  /** One query per column (status=…&pageSize=100). */
  columns: Record<BoardColumn, UseQueryResult<TicketList>>;
  /** Column counts (boardCounts); undefined while loading. */
  counts: Partial<Record<BoardColumn, number>>;
  isMobile: boolean;
  /** Runs card actions and drops (useTicketActions().run); drops pass onSettled. */
  onAction: OnTicketAction;
  /** "View all in Table": the Table view filtered to that status. */
  onShowAll: (column: BoardColumn) => void;
}

/** A dropped card shown in its new column until the request (or its dialog) settles. */
interface PendingMove {
  ticket: MaintenanceTicket;
  from: BoardColumn;
  to: BoardColumn;
}

type DragState = "target" | "over" | "source" | "blocked";
type DropProps = { onDragOver: (e: DragEvent) => void; onDragLeave: (e: DragEvent) => void; onDrop: (e: DragEvent) => void };

/**
 * The four columns (Open, Assigned, In progress, Resolved this week), each with its count, cards, skeletons, empty text and
 * its own error with Retry. A column with more than 100 tickets says "Showing 100 of N" and links to the Table view.
 * 2 columns from 768px, 4 from 1200px (a 1280 window with a scrollbar is just under xl). Phones: one column at a time under
 * Tabs with the counts, no drag.
 *
 * Desktop drag and drop (the browser's built-in one, no library): while a card is dragged, the columns it can go to (from
 * dropRules / allowedActions) get a green outline and the others dim. A drop moves the card at once and runs the action
 * (Start, Unassign, Reopen) or opens its dialog (Assign, Resolve); the card snaps back when the request fails (the backend
 * message shows) or the dialog is cancelled. A drop on a column that refuses the card shows why. The card menu and buttons
 * stay the keyboard way to move a card.
 */
export function TicketBoard({ columns, counts, isMobile, onAction, onShowAll }: TicketBoardProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<BoardColumn>("OPEN");
  const [dragging, setDragging] = useState<MaintenanceTicket | null>(null);
  const [over, setOver] = useState<BoardColumn | null>(null);
  const [pending, setPending] = useState<PendingMove[]>([]);
  // One clock per render, so every card's age and SLA agree.
  const now = new Date();
  const shown = isMobile ? [tab] : BOARD_COLUMNS;
  const targets = dragging ? dropTargets(dragging, BOARD_COLUMNS) : [];

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };
  const settle = (id: string) => setPending((list) => list.filter((m) => m.ticket.id !== id));

  const drop = (to: BoardColumn) => {
    const t = dragging;
    endDrag();
    if (!t) return;
    const result = dropResult(t, to);
    if (result.type === "none") return;
    if (result.type === "blocked") return void toast.info(result.message);
    setPending((list) => [...list.filter((m) => m.ticket.id !== t.id), { ticket: t, from: t.status as BoardColumn, to: result.lands }]);
    onAction(result.kind, t, {
      onSettled: (ok) => {
        // Failed or cancelled: snap back now. Saved: keep it in place until the columns have refetched.
        if (!ok) return settle(t.id);
        void qc.invalidateQueries({ queryKey: maintenanceKeys.lists }).finally(() => settle(t.id));
      },
    });
  };

  /** A column's cards and count with the pending moves applied: they leave their old column and sit on top of the new one. */
  const view = (column: BoardColumn) => {
    const server = columns[column].data?.items ?? [];
    let items = server.filter((t) => !pending.some((m) => m.ticket.id === t.id && m.to !== column));
    for (const m of pending) {
      if (m.to === column && !items.some((t) => t.id === m.ticket.id)) items = [{ ...m.ticket, status: column }, ...items];
    }
    const delta = pending.filter((m) => m.to === column).length - pending.filter((m) => m.from === column).length;
    const count = counts[column];
    return { items, count: count === undefined ? undefined : Math.max(0, count + delta) };
  };

  // Every column takes the drop (so a refused one can say why); only the allowed ones are highlighted.
  const dropProps = (column: BoardColumn): DropProps => ({
    onDragOver: (e) => {
      if (!dragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (over !== column) setOver(column);
    },
    onDragLeave: (e) => {
      if (over === column && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      drop(column);
    },
  });

  const dragStateOf = (column: BoardColumn): DragState | undefined => {
    if (!dragging) return undefined;
    if (targets.includes(column)) return over === column ? "over" : "target";
    return dragging.status === column ? "source" : "blocked";
  };

  const cardDrag = (t: MaintenanceTicket): TicketCardProps["drag"] => ({
    onStart: setDragging,
    onEnd: endDrag,
    active: dragging?.id === t.id,
    pending: pending.some((m) => m.ticket.id === t.id),
  });

  return (
    <div className="flex flex-col gap-3">
      {isMobile && (
        <Tabs<BoardColumn>
          value={tab}
          onChange={setTab}
          tabs={BOARD_COLUMNS.map((c) => ({
            value: c,
            label: columnLabels[c],
            count: counts[c],
            countTone: c === "OPEN" && (counts.OPEN ?? 0) > 0 ? "danger" : "neutral",
          }))}
        />
      )}
      <div className={cn("grid items-start gap-4", !isMobile && "min-[768px]:grid-cols-2 min-[1200px]:grid-cols-4")}>
        {shown.map((c) => {
          const { items, count } = isMobile ? { items: columns[c].data?.items ?? [], count: counts[c] } : view(c);
          return (
            <Column
              key={c}
              column={c}
              query={columns[c]}
              items={items}
              count={count}
              isMobile={isMobile}
              now={now}
              onAction={onAction}
              onShowAll={onShowAll}
              dragState={dragStateOf(c)}
              dropProps={isMobile ? undefined : dropProps(c)}
              cardDrag={isMobile ? undefined : cardDrag}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ColumnProps {
  column: BoardColumn;
  query: UseQueryResult<TicketList>;
  /** The cards to show (pending moves applied). */
  items: MaintenanceTicket[];
  count: number | undefined;
  isMobile: boolean;
  now: Date;
  onAction: OnTicketAction;
  onShowAll: (column: BoardColumn) => void;
  /** While a card is dragged: a drop target (hovered or not), the card's own column, or a column that refuses it. */
  dragState?: DragState;
  dropProps?: DropProps;
  cardDrag?: (t: MaintenanceTicket) => TicketCardProps["drag"];
}

function Column({ column, query, items, count, isMobile, now, onAction, onShowAll, dragState, dropProps, cardDrag }: ColumnProps) {
  const total = query.data?.totalItems ?? 0;
  const fromServer = query.data?.items.length ?? 0;
  const label = columnLabels[column];

  return (
    <section
      aria-label={column === "RESOLVED" ? "Resolved this week" : label}
      {...dropProps}
      className={cn(
        "flex min-w-0 flex-col gap-2.5",
        !isMobile && "rounded-card border border-border-subtle bg-surface-2 p-3 transition-[opacity,border-color,background-color] duration-fast",
        (dragState === "target" || dragState === "over") && "border-success",
        dragState === "over" && "bg-success-soft",
        dragState === "blocked" && "opacity-50",
      )}
    >
      {!isMobile && (
        <div className="flex items-center gap-2 px-1 pt-1 pb-1">
          <span className="text-h3 text-text-primary">{label}</span>
          {count !== undefined && <Count>{count}</Count>}
          {column === "RESOLVED" && <Caption className="ml-auto">This week</Caption>}
        </div>
      )}
      {isMobile && column === "RESOLVED" && <Caption>Resolved since Sunday.</Caption>}

      {query.isError && !query.data ? (
        <InlineError title={`Couldn't load ${label.toLowerCase()} tickets`} description={errorText(query.error)} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        Array.from({ length: 3 }).map((_, i) => <TicketCardSkeleton key={i} />)
      ) : items.length === 0 ? (
        <div className="rounded-control border border-dashed border-border-strong px-3 py-6 text-center">
          <Small>{emptyText[column]}</Small>
        </div>
      ) : (
        <>
          <ul className={cn("m-0 flex list-none flex-col gap-2.5 p-0 transition-opacity", query.isPlaceholderData && "opacity-60")}>
            {items.map((t) => (
              <li key={t.id} className="min-w-0">
                <TicketCard ticket={t} onAction={onAction} now={now} drag={cardDrag?.(t)} />
              </li>
            ))}
          </ul>
          {total > fromServer && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-small text-text-secondary">
              <span className="tabular">
                Showing {fromServer} of {total.toLocaleString("en-US")}
              </span>
              <button type="button" className={cn(textLink, "max-md:min-h-11")} onClick={() => onShowAll(column)}>
                View all in Table
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
