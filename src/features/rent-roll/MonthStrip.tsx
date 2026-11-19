import { cn } from "@/lib/cn";
import { cellDescription, cellTenants, isReservedRow, toneOf } from "@/features/rent-roll/yearStats";
import type { RentRollYearRow } from "@/types/rentRoll";

const LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * The phone card's 12-month strip: one small square per month (J F M …) with the desktop's colour rules (problems stand out,
 * paid calm, vacant / reserved striped) and a dot on OVERDUE. Spans with list roles (it sits inside ListCard's note line),
 * each read as the full cell text with the month's tenant.
 */
export function MonthStrip({ row, year }: { row: RentRollYearRow; year: number }) {
  const reserved = isReservedRow(row);
  return (
    <span role="list" aria-label={`Payments in ${year}`} className="mt-2 grid grid-cols-12 gap-1">
      {row.months.map((c, i) => {
        const tone = toneOf(c, reserved);
        return (
          <span
            key={c.month}
            role="listitem"
            className={cn("relative flex h-6 min-w-0 items-center justify-center rounded-sm border text-caption font-semibold", tone.swatch, tone.cell, "shadow-none")}
          >
            <span aria-hidden>{LETTERS[i]}</span>
            <span className="sr-only">{cellDescription(c, { reserved, tenants: cellTenants(row, c) })}</span>
            {c.status === "OVERDUE" && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger ring-2 ring-surface-1" />}
          </span>
        );
      })}
    </span>
  );
}
