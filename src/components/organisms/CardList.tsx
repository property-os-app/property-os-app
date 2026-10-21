import * as React from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/molecules/Cards";
import { EmptyState, InlineError } from "@/components/molecules/Feedback";
import { ListCardSkeleton } from "@/components/molecules/ListCard";

export interface CardListProps<Row> {
  rows: Row[];
  rowKey: (row: Row) => string;
  /** One `ListCard` per row. */
  renderCard: (row: Row) => React.ReactNode;
  /** Same five states as DataTable. */
  state?: "ideal" | "loading" | "empty" | "error";
  empty?: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode };
  error?: { title: string; description?: string; onRetry?: () => void };
  /** Card above the list (e.g. totals). Shown only with rows. */
  summary?: React.ReactNode;
  /** Pagination under the list. */
  footer?: React.ReactNode;
  /** Accessible name of the list. */
  caption: string;
  /** Divided rows without their own borders, inside a card or drawer. */
  flat?: boolean;
  skeletons?: number;
  className?: string;
}

/** The phone version of a DataTable: the same rows as cards, with loading skeletons, empty, error and the pagination footer. */
export function CardList<Row>({
  rows, rowKey, renderCard, state = "ideal", empty, error, summary, footer, caption, flat, skeletons = 4, className,
}: CardListProps<Row>) {
  let body: React.ReactNode;
  if (state === "error") {
    body = error ? <InlineError {...error} className={cn(flat && "m-4")} /> : null;
  } else if (state === "empty") {
    body = empty ? (flat ? <EmptyState {...empty} /> : <Card padding="none"><EmptyState {...empty} /></Card>) : null;
  } else if (state === "loading") {
    body = (
      <div aria-busy="true" aria-label={caption} className={cn("flex flex-col", flat ? "divide-y divide-border-subtle" : "gap-3")}>
        {Array.from({ length: skeletons }).map((_, i) => (
          <ListCardSkeleton key={i} flat={flat} />
        ))}
      </div>
    );
  } else {
    body = (
      <>
        {summary}
        <ul aria-label={caption} className={cn("m-0 flex list-none flex-col p-0", flat ? "divide-y divide-border-subtle" : "gap-3")}>
          {rows.map((row) => (
            <li key={rowKey(row)}>{renderCard(row)}</li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {body}
      {state === "ideal" && footer && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 text-small text-text-secondary", flat && "border-t border-border-subtle px-4 py-2")}>{footer}</div>
      )}
    </div>
  );
}
