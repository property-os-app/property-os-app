import { cn } from "@/lib/cn";
import { cellDescription, cellTone } from "@/features/rent-roll/yearStats";
import type { RentRollYearCell } from "@/types/rentRoll";

const LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * The phone card's 12-month strip: one small square per month (J F M …), coloured like the desktop cells, with a dot on
 * OVERDUE. Spans with list roles (it sits inside ListCard's caption line), each read as the full cell text.
 */
export function MonthStrip({ cells, year, reserved = false }: { cells: RentRollYearCell[]; year: number; reserved?: boolean }) {
  return (
    <span role="list" aria-label={`Payments in ${year}`} className="mt-2 grid grid-cols-12 gap-1">
      {cells.map((c, i) => (
        <span
          key={c.month}
          role="listitem"
          className={cn("relative flex h-6 min-w-0 items-center justify-center rounded-sm border text-caption font-semibold", cellTone[c.status].swatch, cellTone[c.status].cell, "shadow-none")}
        >
          <span aria-hidden>{LETTERS[i]}</span>
          <span className="sr-only">{cellDescription(c, reserved)}</span>
          {c.status === "OVERDUE" && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger ring-2 ring-surface-1" />}
        </span>
      ))}
    </span>
  );
}
