import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Caption, Count, Small } from "@/components/atoms";
import { InlineError, Tabs } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { textLink } from "@/features/shared/linkClass";
import { TicketCard, TicketCardSkeleton } from "@/features/maintenance/TicketCard";
import type { OnTicketAction } from "@/features/maintenance/ticketMenu";
import { BOARD_COLUMNS, type BoardColumn } from "@/features/maintenance/ticketQuery";
import type { TicketList } from "@/types/maintenance";

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
  onAction: OnTicketAction;
  /** "View all in Table": the Table view filtered to that status. */
  onShowAll: (column: BoardColumn) => void;
}

/**
 * The four columns (Open, Assigned, In progress, Resolved this week), each with its count, cards, skeletons, empty text and
 * its own error with Retry. A column with more than 100 tickets says "Showing 100 of N" and links to the Table view.
 * 2 columns from md, 4 from 1200px (a 1280 window with a scrollbar is just under xl). Phones: one column at a time under Tabs with the counts. No drag-and-drop: status changes
 * go through each card's menu or the drawer.
 */
export function TicketBoard({ columns, counts, isMobile, onAction, onShowAll }: TicketBoardProps) {
  const [tab, setTab] = useState<BoardColumn>("OPEN");
  // One clock per render, so every card's age and SLA agree.
  const now = new Date();
  const shown = isMobile ? [tab] : BOARD_COLUMNS;

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
        {shown.map((c) => (
          <Column key={c} column={c} query={columns[c]} count={counts[c]} isMobile={isMobile} now={now} onAction={onAction} onShowAll={onShowAll} />
        ))}
      </div>
    </div>
  );
}

interface ColumnProps {
  column: BoardColumn;
  query: UseQueryResult<TicketList>;
  count: number | undefined;
  isMobile: boolean;
  now: Date;
  onAction: OnTicketAction;
  onShowAll: (column: BoardColumn) => void;
}

function Column({ column, query, count, isMobile, now, onAction, onShowAll }: ColumnProps) {
  const items = query.data?.items ?? [];
  const total = query.data?.totalItems ?? 0;
  const label = columnLabels[column];

  return (
    <section
      aria-label={column === "RESOLVED" ? "Resolved this week" : label}
      className={cn("flex min-w-0 flex-col gap-2.5", !isMobile && "rounded-card border border-border-subtle bg-surface-2 p-3")}
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
                <TicketCard ticket={t} onAction={onAction} now={now} />
              </li>
            ))}
          </ul>
          {total > items.length && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-small text-text-secondary">
              <span className="tabular">
                Showing {items.length} of {total.toLocaleString("en-US")}
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
