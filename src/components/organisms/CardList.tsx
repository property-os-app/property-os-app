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
  /** Cards in a grid (1 column, 2 from md, 3 from xl) instead of one column: the desktop Cards view. Ignored with `flat`. */
  grid?: boolean;
  skeletons?: number;
  className?: string;
}

/**
 * Column classes for a Cards view: 1 column, 2 from md, 3 from xl (`max={2}`: stops at 2). Every column is
 * minmax(0, 1fr) (Tailwind's grid-cols-N), so all cards in a row are the same width and can shrink.
 */
const gridColumns = { 2: "grid-cols-1 md:grid-cols-2", 3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" } as const;

/**
 * The grid of a desktop Cards view (also used by CardList's `grid`). Each child gets `min-w-0`: without it a grid item
 * is at least as wide as its longest unbroken line (truncated text included) and spills over the next card.
 */
export function CardGrid({ max = 3, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { max?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-4 *:min-w-0", gridColumns[max], className)} {...props}>
      {children}
    </div>
  );
}

/** The phone version of a DataTable: the same rows as cards, with loading skeletons, empty, error and the pagination footer. */
export function CardList<Row>({
  rows, rowKey, renderCard, state = "ideal", empty, error, summary, footer, caption, flat, grid, skeletons, className,
}: CardListProps<Row>) {
  const asGrid = grid && !flat;
  const layout = flat ? "flex flex-col divide-y divide-border-subtle" : asGrid ? `grid gap-4 *:min-w-0 ${gridColumns[3]}` : "flex flex-col gap-3";
  let body: React.ReactNode;
  if (state === "error") {
    body = error ? <InlineError {...error} className={cn(flat && "m-4")} /> : null;
  } else if (state === "empty") {
    body = empty ? (flat ? <EmptyState {...empty} /> : <Card padding="none"><EmptyState {...empty} /></Card>) : null;
  } else if (state === "loading") {
    body = (
      <div aria-busy="true" aria-label={caption} className={layout}>
        {Array.from({ length: skeletons ?? (asGrid ? 6 : 4) }).map((_, i) => (
          <ListCardSkeleton key={i} flat={flat} />
        ))}
      </div>
    );
  } else {
    body = (
      <>
        {summary}
        <ul aria-label={caption} className={cn("m-0 list-none p-0", layout)}>
          {rows.map((row) => (
            // In the grid the card fills its cell (same height in a row); the li's one column is minmax(0, 1fr), so a long
            // line can't make the card wider than its column.
            <li key={rowKey(row)} className={asGrid ? "grid min-w-0 grid-cols-1" : undefined}>{renderCard(row)}</li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <div className={cn("flex min-w-0 flex-col", asGrid ? "gap-4" : "gap-3", className)}>
      {body}
      {state === "ideal" && footer && (
        <div className={cn("flex flex-wrap items-center justify-between gap-2 text-small text-text-secondary", flat && "border-t border-border-subtle px-4 py-2")}>{footer}</div>
      )}
    </div>
  );
}
