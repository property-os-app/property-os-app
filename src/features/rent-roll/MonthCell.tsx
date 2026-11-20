import { AlertCircle } from "lucide-react";
import { Dash } from "@/components/atoms";
import { cellDescription, cellDisplay } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell } from "@/types/rentRoll";

export interface MonthCellProps {
  cell: RentRollYearCell;
  /** A reserved unit: its vacant months read "Reserved". */
  reserved?: boolean;
  /** Who the month belongs to ("John Smith → Sarah Lee"), for the tooltip and screen readers. */
  tenants?: string;
}

/**
 * One month in the yearly table: the amount paid in short money ("$2,000"; vacant / reserved months are stripes, future
 * months empty, a Dash outside a lease), an alert icon on OVERDUE. The background comes from `monthCellClass` (SpreadsheetTable
 * `cellClassName`). The tooltip and screen-reader text carry the exact amounts and the month's tenant, so status is never
 * told by colour alone. Not clickable on its own: the row opens the current lease.
 */
export function MonthCell({ cell, reserved = false, tenants }: MonthCellProps) {
  const text = cellDisplay(cell);
  const description = cellDescription(cell, { reserved, tenants });
  return (
    <>
      <span aria-hidden title={description} className="flex min-h-5 items-center justify-end gap-1">
        {cell.status === "OVERDUE" && <AlertCircle size={12} strokeWidth={2} className="shrink-0" />}
        {text === null ? <Dash /> : text}
      </span>
      <span className="sr-only">{description}</span>
    </>
  );
}
