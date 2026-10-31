import * as React from "react";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Checkbox } from "@/components/atoms/Input";
import { Skeleton } from "@/components/atoms/Skeleton";
import { EmptyState, InlineError } from "@/components/molecules/Feedback";

export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  /** Right-align numbers. */
  align?: "left" | "right";
  width?: number | string;
  sortable?: boolean;
  /** Sticky first column for wide finance tables. */
  sticky?: boolean;
  /** Only from 1440px wide: under that the whole column (header, cells, skeletons, totals) is hidden. Show its info elsewhere (a second line, the drawer). */
  wideOnly?: boolean;
  className?: string;
}

/** Hides a `wideOnly` column's cells under 1440px. */
const wide = (c: { wideOnly?: boolean } | undefined) => c?.wideOnly && "hidden min-[1440px]:table-cell";

export type SortState = { key: string; direction: "asc" | "desc" } | null;

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Row click opens the detail drawer. */
  onRowClick?: (row: Row) => void;
  /** With onRowClick: rows where this is false get no pointer and no click. Default: every row is clickable. */
  rowClickable?: (row: Row) => boolean;
  /** Red 4px bar on the left edge of the row's first cell (like ListCard's `strip`). Pair it with a visible label, never color alone. */
  rowStrip?: (row: Row) => boolean;
  /** Bulk selection. */
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  /** Shown above the table while rows are selected. */
  bulkActions?: (selected: Set<string>) => React.ReactNode;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  density?: "default" | "compact";
  /** Sticky bottom totals row. */
  totals?: React.ReactNode[];
  /** Five states. */
  state?: "ideal" | "loading" | "empty" | "error";
  empty?: { title: string; description: string; action?: React.ReactNode };
  error?: { title: string; description?: string; onRetry?: () => void };
  footer?: React.ReactNode;
  className?: string;
  caption?: string;
}

/**
 * Data table: Overline sticky header, 48px rows (40 compact), hover surface-3, checkbox column, kebab in the last column.
 * Default sort should be by urgency (overdue first, soonest expiry first, emergency first), decided by the caller.
 */
export function DataTable<Row>({
  columns, rows, rowKey, onRowClick, rowClickable, rowStrip, selected, onSelectedChange, bulkActions, sort, onSortChange, density = "default",
  totals, state = "ideal", empty, error, footer, className, caption,
}: DataTableProps<Row>) {
  const selectable = Boolean(selected && onSelectedChange);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected!.has(rowKey(r)));
  const rowH = density === "compact" ? "h-10" : "h-12";

  const toggleAll = () => {
    if (!selectable) return;
    onSelectedChange!(allSelected ? new Set() : new Set(rows.map(rowKey)));
  };
  const toggleOne = (id: string) => {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectedChange!(next);
  };
  const cycleSort = (key: string) => {
    if (!onSortChange) return;
    if (sort?.key !== key) return onSortChange({ key, direction: "asc" });
    if (sort.direction === "asc") return onSortChange({ key, direction: "desc" });
    onSortChange(null);
  };

  return (
    <div className={cn("overflow-hidden rounded-card border border-border-subtle bg-surface-1", className)}>
      {selectable && selected!.size > 0 && bulkActions && (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-2 px-4 py-2.5">
          <span className="text-small">{selected!.size} selected</span>
          <div className="flex items-center gap-2">{bulkActions(selected!)}</div>
        </div>
      )}
      {/* relative: screen-reader-only labels (absolute) inside the table use this box, so they scroll with it instead of widening the page. */}
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-body">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectable && (
                <th className="w-11 border-b border-border-subtle bg-surface-2 px-4 py-3">
                  <Checkbox aria-label="Select all rows" checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  aria-sort={sort?.key === c.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "whitespace-nowrap border-b border-border-subtle bg-surface-2 px-4 py-3 text-overline uppercase text-text-secondary",
                    c.align === "right" ? "text-right" : "text-left",
                    c.sticky && "sticky left-0 z-[1]",
                    wide(c),
                  )}
                >
                  {c.sortable && onSortChange ? (
                    <button type="button" onClick={() => cycleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-text-primary focus-visible:focus-ring">
                      {c.header}
                      {sort?.key === c.key ? (sort.direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="text-text-muted" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state === "loading" &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={rowH}>
                  {selectable && <td className="border-b border-border-subtle px-4"><Skeleton className="size-[18px]" /></td>}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("border-b border-border-subtle px-4", wide(c))}>
                      <Skeleton className={cn("h-3", c.align === "right" ? "ml-auto w-16" : "w-28")} />
                    </td>
                  ))}
                </tr>
              ))}
            {state === "ideal" &&
              rows.map((row) => {
                const id = rowKey(row);
                const isSel = selectable && selected!.has(id);
                const strip = rowStrip?.(row) ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-danger" /> : null;
                const clickable = Boolean(onRowClick) && (rowClickable?.(row) ?? true);
                return (
                  <tr
                    key={id}
                    onClick={clickable ? () => onRowClick!(row) : undefined}
                    className={cn("group", rowH, clickable && "cursor-pointer", isSel ? "bg-surface-3" : "hover:bg-surface-3")}
                  >
                    {selectable && (
                      <td className={cn("border-b border-border-subtle px-4", strip && "relative")} onClick={(e) => e.stopPropagation()}>
                        {strip}
                        <Checkbox aria-label={`Select row ${id}`} checked={isSel} onChange={() => toggleOne(id)} />
                      </td>
                    )}
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        className={cn(
                          "whitespace-nowrap border-b border-border-subtle px-4 text-text-primary group-last:border-b-0",
                          strip && i === 0 && !selectable && "relative",
                          c.align === "right" && "text-right tabular",
                          c.sticky && "sticky left-0 z-[1] bg-surface-1 group-hover:bg-surface-3",
                          wide(c),
                          c.className,
                        )}
                      >
                        {i === 0 && !selectable && strip}
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            {state === "ideal" && totals && (
              <tr className="sticky bottom-0 h-12 bg-surface-2 font-bold">
                {selectable && <td className="border-t border-border-strong" />}
                {totals.map((t, i) => (
                  <td key={i} className={cn("whitespace-nowrap border-t border-border-strong px-4", columns[i]?.align === "right" && "text-right tabular", wide(columns[i]))}>{t}</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
        {state === "empty" && empty && <EmptyState {...empty} />}
        {state === "error" && error && <div className="p-4"><InlineError {...error} /></div>}
      </div>
      {footer && <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3 text-small text-text-secondary">{footer}</div>}
    </div>
  );
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  summary?: string;
}

/** Page number buttons from md up; under md: Previous, "Page 2 of 5", Next (44px tap targets). */
export function Pagination({ page, pageCount, onPageChange, summary }: PaginationProps) {
  const pages = Array.from({ length: Math.min(pageCount, 8) }, (_, i) => i + 1);
  const step = "inline-flex size-11 items-center justify-center rounded-badge text-text-secondary hover:bg-surface-3 focus-visible:focus-ring disabled:opacity-50 md:hidden";
  return (
    <>
      <span>{summary}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={step}>
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="px-1 md:hidden">
          Page {page} of {pageCount}
        </span>
        <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className={step}>
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
            className={cn("size-8 rounded-badge text-small focus-visible:focus-ring max-md:hidden", p === page ? "bg-surface-3 text-text-primary" : "text-text-secondary hover:bg-surface-3")}
          >
            {p}
          </button>
        ))}
      </nav>
    </>
  );
}
