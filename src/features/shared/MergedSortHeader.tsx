import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { SortState } from "@/components/organisms";

export interface MergedSortHeaderProps {
  sort: SortState | undefined;
  onSortChange: ((sort: SortState) => void) | undefined;
  /** [sort key, label] per merged column, e.g. [["rating", "Rating"], ["jobs", "Jobs"]]. */
  keys: [string, string][];
}

/**
 * The header of a DataTable column that merges several sortable columns: one sort button per merged column, same look and
 * cycle as DataTable's own (ascending → descending → off). Use it as the column's `header` and leave `sortable` off.
 */
export function MergedSortHeader({ sort, onSortChange, keys }: MergedSortHeaderProps) {
  const cycle = (key: string) => {
    if (!onSortChange) return;
    if (sort?.key !== key) return onSortChange({ key, direction: "asc" });
    onSortChange(sort.direction === "asc" ? { key, direction: "desc" } : null);
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys.map(([key, label], i) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>·</span>}
          {onSortChange ? (
            <button
              type="button"
              onClick={() => cycle(key)}
              aria-label={`Sort by ${label}${sort?.key === key ? (sort.direction === "asc" ? ", ascending" : ", descending") : ""}`}
              className="inline-flex items-center gap-1 uppercase hover:text-text-primary focus-visible:focus-ring"
            >
              {label}
              {sort?.key === key ? (
                sort.direction === "asc" ? (
                  <ArrowUp size={12} />
                ) : (
                  <ArrowDown size={12} />
                )
              ) : (
                <ChevronsUpDown size={12} className="text-text-muted" />
              )}
            </button>
          ) : (
            label
          )}
        </span>
      ))}
    </span>
  );
}
