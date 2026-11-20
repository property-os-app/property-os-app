import * as React from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/atoms/Skeleton";
import { EmptyState, InlineError } from "@/components/molecules/Feedback";

export interface SheetColumn<Row> {
  key: string;
  /** Visible header (may be short, e.g. "Jan"). */
  header: React.ReactNode;
  /** Full name for screen readers when the header is short ("January 2026"); also the header tooltip. */
  headerLabel?: string;
  cell: (row: Row) => React.ReactNode;
  /** Extra classes for one row's cell (e.g. a status background). Theme tokens only. */
  cellClassName?: (row: Row) => string | undefined;
  align?: "left" | "right";
  /** Minimum width (px or CSS). */
  minWidth?: number | string;
  /** Extra classes for the body cells of this column. */
  className?: string;
  /** Extra classes for EVERY cell of the column: header, rows, subtotals and total (separators, a "current" outline). Theme tokens only. */
  columnClassName?: string;
  /** "right": pinned to the right edge while the columns before it scroll (e.g. a Total column). Give it a minWidth. */
  sticky?: "right";
}

export interface SheetGroup<Row> {
  key: string;
  /** Group header row (e.g. the property name). Stays visible while the table scrolls sideways. */
  label: React.ReactNode;
  rows: Row[];
  /** Subtotal row under the group: one node per column (the first one is the row's label). */
  subtotal?: React.ReactNode[];
}

export interface SpreadsheetTableProps<Row> {
  /** The first column is the row header (sticky on the left, `th scope="row"`). */
  columns: SheetColumn<Row>[];
  groups: SheetGroup<Row>[];
  rowKey: (row: Row) => string;
  /** Row click. Put a real button or link in the first cell too, for the keyboard. */
  onRowClick?: (row: Row) => void;
  /** Muted row (e.g. a vacant unit). */
  rowMuted?: (row: Row) => boolean;
  /** Grand total row, sticky at the bottom: one node per column. */
  totals?: React.ReactNode[];
  state?: "ideal" | "loading" | "empty" | "error";
  empty?: { title: string; description: string; action?: React.ReactNode };
  error?: { title: string; description?: string; onRetry?: () => void };
  /** Required: names the table for screen readers. */
  caption: string;
  /** Under the scroll box (notes, legends). */
  footer?: React.ReactNode;
  className?: string;
  /** Height of the scroll box. Default: the viewport minus the page chrome, at least 360px. */
  maxHeight?: string;
  /**
   * The page is the only vertical scroller: the box has no height limit; the header row stays under the sticky Topbar and
   * the total row at the bottom of the screen while the page scrolls (a small transform, measured on scroll); a thin
   * horizontal scrollbar sticks to the bottom of the screen. Use it when the table is the last thing on the page.
   */
  pageScroll?: boolean;
  /** A column key to scroll into view sideways once the rows load (e.g. the current month), next to a pinned-right column. */
  scrollToColumn?: string;
}

const cellBase = "whitespace-nowrap border-b border-border-subtle px-3 tabular";
const alignClass = (c: { align?: "left" | "right" } | undefined) => (c?.align === "right" ? "text-right" : "text-left");
/** The pinned-right column's left edge: a strong border and a soft shadow, so the columns scrolling under it look intentional. */
const pinEdge = "border-l border-l-border-strong shadow-[-8px_0_8px_-8px_color-mix(in_srgb,var(--text-primary)_35%,transparent)]";
/** A pinned-right cell: opaque (set by the caller), the edge, above the scrolling cells. */
const stickyRight = (c: { sticky?: "right" } | undefined) => (c?.sticky === "right" ? cn("sticky right-0", pinEdge) : undefined);
/** pageScroll: the bottom of the page's sticky top bar (a sticky <header>), else 0. */
function stickyTopOffset(): number {
  const bar = document.querySelector<HTMLElement>("header");
  return bar && getComputedStyle(bar).position === "sticky" ? Math.max(0, bar.getBoundingClientRect().bottom) : 0;
}
/**
 * Row hover: a light tint painted as a background IMAGE over the cell's own background colour, so status colours
 * (and sticky cells' opaque backgrounds) stay visible under it. Built from --text-primary, so it works in both themes.
 */
const rowHover =
  "group-hover:bg-[image:linear-gradient(color-mix(in_srgb,var(--text-primary)_6%,transparent),color-mix(in_srgb,var(--text-primary)_6%,transparent))]";

/**
 * Spreadsheet-style table for wide finance grids (the yearly rent roll). A real `<table>`: caption, `th scope="col"`,
 * the first column as `th scope="row"`, group headers as `th scope="rowgroup"`.
 * It scrolls inside its own box (both ways), so the sticky header, the sticky first column, an optional column pinned
 * right (`sticky: "right"`) and the sticky total row all work and the page itself never scrolls sideways. Groups get a
 * header row (a band) and an optional subtotal row. Five states like DataTable. Cells can carry their own background
 * (`cellClassName`); `columnClassName` styles a whole column (separators, a "current" outline). Hovering a row tints it
 * without hiding the cells' own colours. With `pageScroll` the box only scrolls sideways and the page scrolls down (one
 * vertical scrollbar); `scrollToColumn` brings a column (e.g. the current month) into view on load.
 */
export function SpreadsheetTable<Row>({
  columns, groups, rowKey, onRowClick, rowMuted, totals, state = "ideal", empty, error, caption, footer, className,
  maxHeight = "max(360px, calc(100dvh - 14rem))", pageScroll = false, scrollToColumn,
}: SpreadsheetTableProps<Row>) {
  const span = columns.length;
  const boxRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const [rail, setRail] = React.useState<{ scroll: number; client: number } | null>(null);

  // pageScroll: keep the header under the Topbar and the total row above the screen's bottom edge (and the rail) while
  // the page scrolls, by moving them with --sheet-head-y / --sheet-foot-y. Also sizes the bottom scroll rail to the table.
  React.useLayoutEffect(() => {
    if (!pageScroll) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const table = tableRef.current;
      const box = boxRef.current;
      if (!table || !box) return;
      const rect = table.getBoundingClientRect();
      const head = table.tHead?.getBoundingClientRect().height ?? 0;
      const foot = table.tFoot?.getBoundingClientRect().height ?? 0;
      const railHeight = railRef.current?.offsetHeight ?? 0;
      const room = Math.max(0, rect.height - head - foot);
      const headY = Math.min(Math.max(0, stickyTopOffset() - rect.top), room);
      const footY = Math.max(Math.min(0, window.innerHeight - railHeight - rect.bottom), -Math.max(0, room - headY));
      table.style.setProperty("--sheet-head-y", `${headY}px`);
      table.style.setProperty("--sheet-foot-y", `${footY}px`);
      const next = { scroll: box.scrollWidth, client: box.clientWidth };
      setRail((prev) => (prev && prev.scroll === next.scroll && prev.client === next.client ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (observer && tableRef.current) observer.observe(tableRef.current);
    observer?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [pageScroll]);

  // The rail and the box scroll sideways together.
  const syncing = React.useRef(false);
  const follow = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  // scrollToColumn: once per column key, after the rows render, bring it in view just left of the pinned-right column.
  const scrolledTo = React.useRef<string | null>(null);
  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!scrollToColumn || state !== "ideal" || !box || scrolledTo.current === scrollToColumn) return;
    const heads = Array.from(box.querySelectorAll<HTMLElement>("th[data-col]"));
    const target = heads.find((th) => th.dataset.col === scrollToColumn);
    if (!target) return;
    const pinned = heads.find((th) => th.dataset.pinned === "right");
    const boxLeft = box.getBoundingClientRect().left;
    const right = target.getBoundingClientRect().right - boxLeft + box.scrollLeft;
    const room = box.clientWidth - (pinned?.offsetWidth ?? 0) - 8;
    if (right > room) {
      box.scrollLeft = right - room;
      if (railRef.current) railRef.current.scrollLeft = box.scrollLeft;
    }
    scrolledTo.current = scrollToColumn;
  });
  // Sticky cells need an opaque background so scrolled cells don't show through.
  const stickyFirst = "sticky left-0 z-[1] border-r border-border-subtle";

  return (
    // pageScroll: overflow-clip (not hidden) makes no scroll container, so the rail can stick to the bottom of the screen.
    <div className={cn("rounded-card border border-border-subtle bg-surface-1", pageScroll ? "overflow-clip" : "overflow-hidden", className)}>
      {/* relative: sr-only text inside the table uses this box, so it scrolls with it instead of widening the page. */}
      <div
        ref={boxRef}
        className={cn(
          "relative overflow-auto overscroll-x-contain",
          // pageScroll: the rail below is the visible horizontal scrollbar (trackpads and Shift+wheel still scroll the box).
          pageScroll && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={pageScroll ? undefined : { maxHeight }}
        onScroll={pageScroll ? (e) => follow(e.currentTarget, railRef.current) : undefined}
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table ref={tableRef} className="min-w-full border-separate border-spacing-0 text-body">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  data-col={c.key}
                  data-pinned={c.sticky}
                  title={c.headerLabel}
                  style={{ minWidth: c.minWidth, transform: pageScroll ? "translateY(var(--sheet-head-y, 0px))" : undefined }}
                  className={cn(
                    "sticky top-0 whitespace-nowrap border-b border-border-subtle bg-surface-2 px-3 py-2.5 text-overline uppercase text-text-secondary",
                    alignClass(c),
                    i === 0 ? "left-0 z-[3] border-r" : c.sticky === "right" ? cn("right-0 z-[3]", pinEdge) : "z-[2]",
                    c.columnClassName,
                  )}
                >
                  {c.headerLabel ? (
                    <>
                      <span aria-hidden>{c.header}</span>
                      <span className="sr-only">{c.headerLabel}</span>
                    </>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {state === "loading" && (
            <tbody>
              {Array.from({ length: 8 }).map((_, r) => (
                <tr key={r} className="h-11">
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn(cellBase, i === 0 && cn(stickyFirst, "bg-surface-1"), c.sticky === "right" && cn(stickyRight(c), "z-[1] bg-surface-1"), c.columnClassName)}>
                      <Skeleton className={cn("h-3", i === 0 ? "w-36" : "ml-auto w-14")} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {state === "ideal" &&
            groups.map((g) => (
              <tbody key={g.key}>
                <tr>
                  <th scope="rowgroup" colSpan={span} className="border-b border-border-subtle bg-surface-2 p-0 text-left">
                    {/* The label sticks to the left edge while the row scrolls sideways. */}
                    <span className="sticky left-0 inline-block px-3 py-2 text-small font-semibold text-text-primary">{g.label}</span>
                  </th>
                </tr>
                {g.rows.map((row) => {
                  const muted = rowMuted?.(row) ?? false;
                  return (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn("group h-11", onRowClick && "cursor-pointer")}
                    >
                      {columns.map((c, i) => {
                        const own = c.cellClassName?.(row);
                        const Cell = i === 0 ? "th" : "td";
                        return (
                          <Cell
                            key={c.key}
                            scope={i === 0 ? "row" : undefined}
                            className={cn(
                              cellBase,
                              "font-normal",
                              alignClass(c),
                              muted ? "text-text-muted" : "text-text-primary",
                              i === 0 && cn(stickyFirst, "bg-surface-1"),
                              c.sticky === "right" && cn(stickyRight(c), "z-[1] bg-surface-1"),
                              c.className,
                              c.columnClassName,
                              own,
                              rowHover,
                            )}
                          >
                            {c.cell(row)}
                          </Cell>
                        );
                      })}
                    </tr>
                  );
                })}
                {g.subtotal && (
                  <tr className="h-11">
                    {g.subtotal.map((node, i) => {
                      const Cell = i === 0 ? "th" : "td";
                      return (
                        <Cell
                          key={i}
                          scope={i === 0 ? "row" : undefined}
                          className={cn(
                            cellBase,
                            "bg-surface-2 font-semibold text-text-primary",
                            alignClass(columns[i]),
                            i === 0 && stickyFirst,
                            columns[i]?.sticky === "right" && cn(stickyRight(columns[i]), "z-[1]"),
                            columns[i]?.columnClassName,
                          )}
                        >
                          {node}
                        </Cell>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            ))}

          {state === "ideal" && totals && (
            <tfoot>
              <tr className="h-12">
                {totals.map((node, i) => {
                  const Cell = i === 0 ? "th" : "td";
                  return (
                    <Cell
                      key={i}
                      scope={i === 0 ? "row" : undefined}
                      style={pageScroll ? { transform: "translateY(var(--sheet-foot-y, 0px))" } : undefined}
                      className={cn(
                        "sticky bottom-0 whitespace-nowrap border-t border-border-strong bg-surface-2 px-3 font-bold tabular text-text-primary",
                        alignClass(columns[i]),
                        i === 0 ? "left-0 z-[3] border-r border-r-border-subtle" : columns[i]?.sticky === "right" ? cn("right-0 z-[3]", pinEdge) : "z-[2]",
                        columns[i]?.columnClassName,
                      )}
                    >
                      {node}
                    </Cell>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
        {state === "empty" && empty && <EmptyState {...empty} />}
        {state === "error" && error && (
          <div className="p-4">
            <InlineError {...error} />
          </div>
        )}
      </div>
      {pageScroll && rail && rail.scroll > rail.client && (
        // The horizontal scrollbar, stuck to the bottom of the screen while the table is on it.
        <div
          ref={railRef}
          aria-hidden
          className="sticky bottom-0 z-[4] overflow-x-auto overflow-y-hidden border-t border-border-subtle bg-surface-2"
          onScroll={(e) => follow(e.currentTarget, boxRef.current)}
        >
          <div style={{ width: rail.scroll, height: 1 }} />
        </div>
      )}
      {footer && <div className="border-t border-border-subtle px-4 py-3 text-small text-text-secondary">{footer}</div>}
    </div>
  );
}
