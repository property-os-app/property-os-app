import { AlertCircle } from "lucide-react";
import { Dash } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { cellDescription, cellDisplay } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell } from "@/types/rentRoll";

/**
 * One month in the yearly table: the amount paid ("Vacant" / "Reserved" or a Dash for the muted kinds), an alert icon on OVERDUE.
 * The cell background comes from `monthCellClass` (yearStats) (SpreadsheetTable `cellClassName`). Mouse users get the full text as a
 * tooltip; screen readers read it instead of the short visible text, so status is never told by colour alone.
 */
export function MonthCell({ cell, reserved = false }: { cell: RentRollYearCell; reserved?: boolean }) {
  const text = cellDisplay(cell, reserved);
  const description = cellDescription(cell, reserved);
  return (
    <>
      <span aria-hidden title={description} className={cn("flex items-center justify-end gap-1", cell.status === "VACANT" && "text-small")}>
        {cell.status === "OVERDUE" && <AlertCircle size={12} strokeWidth={2} className="shrink-0" />}
        {text ?? <Dash />}
      </span>
      <span className="sr-only">{description}</span>
    </>
  );
}

