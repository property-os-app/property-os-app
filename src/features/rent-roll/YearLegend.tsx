import { cn } from "@/lib/cn";
import { LEGEND_STATUSES, cellStatusLabels, cellTone, reservedTone } from "@/features/rent-roll/yearStats";

/**
 * The colour key above the yearly table and the phone cards: one swatch + label per cell status (problems first), plus
 * Reserved (a reserved unit's stripes). Swatches are decorative: every cell also says its status in words.
 */
export function YearLegend({ className }: { className?: string }) {
  const items = [...LEGEND_STATUSES.map((s) => ({ key: s, label: cellStatusLabels[s], swatch: cellTone[s].swatch })), { key: "RESERVED", label: "Reserved", swatch: reservedTone.swatch }];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-text-secondary", className)}>
      <span className="font-semibold text-text-primary">Cells show the amount paid</span>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Colour key">
        {items.map((it) => (
          <li key={it.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("inline-block size-3.5 rounded-sm border", it.swatch)} />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
