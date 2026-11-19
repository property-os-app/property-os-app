import { AlertCircle } from "lucide-react";
import { Dash } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { linkFocus } from "@/features/shared/linkClass";
import { cellDescription, cellDisplay } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell } from "@/types/rentRoll";

export interface MonthCellProps {
  cell: RentRollYearCell;
  /** A reserved unit: its vacant months read "Reserved". */
  reserved?: boolean;
  /** Who the month belongs to ("John Smith → Sarah Lee"), for the tooltip and screen readers. */
  tenants?: string;
  /** Set when the month belongs to another lease than the row's current one: the cell becomes a button that opens it. */
  openLease?: { leaseNumber: string; onOpen: () => void };
}

/**
 * One month in the yearly table: the amount paid in short money ("$2,000"; vacant / reserved months are stripes, future
 * months empty, a Dash outside a lease), an alert icon on OVERDUE. The background comes from `monthCellClass` (SpreadsheetTable
 * `cellClassName`). The tooltip and screen-reader text carry the exact amounts and the tenant, so status is never told by
 * colour alone. A month of an earlier (or later) lease is a real button: keyboard reachable, it doesn't trigger the row.
 */
export function MonthCell({ cell, reserved = false, tenants, openLease }: MonthCellProps) {
  const text = cellDisplay(cell);
  const description = cellDescription(cell, { reserved, tenants });
  const visible = (
    <>
      {cell.status === "OVERDUE" && <AlertCircle size={12} strokeWidth={2} className="shrink-0" />}
      {text === null ? <Dash /> : text}
    </>
  );
  if (openLease) {
    return (
      <button
        type="button"
        title={`${description} · Open lease ${openLease.leaseNumber}`}
        aria-label={`${description}. Open lease ${openLease.leaseNumber}`}
        onClick={(e) => {
          e.stopPropagation();
          openLease.onOpen();
        }}
        className={cn("flex w-full items-center justify-end gap-1 underline decoration-dotted underline-offset-4", linkFocus)}
      >
        {visible}
      </button>
    );
  }
  return (
    <>
      <span aria-hidden title={description} className={cn("flex min-h-5 items-center justify-end gap-1")}>
        {visible}
      </span>
      <span className="sr-only">{description}</span>
    </>
  );
}
