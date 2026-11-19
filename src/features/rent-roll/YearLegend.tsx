import { cn } from "@/lib/cn";
import { CELL_STATUSES, cellStatusLabels, cellTone } from "@/features/rent-roll/yearStats";

/** The colour key above the yearly table and the phone cards: one swatch + label per cell status. Swatches are decorative. */
export function YearLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-text-secondary", className)}>
      <span className="font-semibold text-text-primary">Cells show the amount paid</span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Colour key">
        {CELL_STATUSES.map((s) => (
          <li key={s} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block size-3.5 rounded-sm border", cellTone[s].swatch)} />
            {cellStatusLabels[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
