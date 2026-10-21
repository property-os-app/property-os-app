import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, Count, Select } from "@/components/atoms";
import { FormField } from "@/components/molecules";
import { Drawer, type SortState } from "@/components/organisms";
import type { SortKind } from "@/lib/useClientTable";

export interface MobileFiltersProps {
  /** Active filters of this page; shown on the button when above 0. The app-wide property is never counted. */
  count: number;
  /** Rows matching the current search and filters, for "Show N results". undefined while loading. */
  resultCount: number | undefined;
  /** Resets this page's filters only: keeps the search and the app-wide property. */
  onClear: () => void;
  /** The filter and sort controls, stacked. */
  children: ReactNode;
}

/** Phone toolbar: a "Filters" button (with the active count) that opens a bottom sheet with the page's controls. */
export function MobileFilters({ count, resultCount, onClear, children }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="h-11 shrink-0"
        icon={<SlidersHorizontal size={16} strokeWidth={1.5} />}
        aria-label={count > 0 ? `Filters, ${count} active` : "Filters"}
        onClick={() => setOpen(true)}
      >
        Filters
        {count > 0 && <Count tone="success">{count}</Count>}
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        title="Filters and sort"
        footer={
          <>
            <Button className="h-11 flex-1" disabled={count === 0} onClick={onClear}>
              Clear filters
            </Button>
            <Button variant="primary" className="h-11 flex-1" onClick={() => setOpen(false)}>
              {resultCount === undefined ? "Show results" : `Show ${resultCount.toLocaleString("en-US")} ${resultCount === 1 ? "result" : "results"}`}
            </Button>
          </>
        }
      >
        {children}
      </Drawer>
    </>
  );
}

export interface SortOption {
  /** Sort key from the page's `useClientTable` `sorts`. */
  key: string;
  label: string;
  kind: SortKind;
}

const directionLabels: Record<SortKind, [string, string]> = {
  text: ["A to Z", "Z to A"],
  number: ["low to high", "high to low"],
  money: ["low to high", "high to low"],
  date: ["soonest first", "latest first"],
};

/** "Sort by" select for phones (no column headers there); writes the same sort as the table headers. */
export function SortSelect({ sort, onSortChange, options, id }: { sort: SortState; onSortChange: (sort: SortState) => void; options: SortOption[]; id: string }) {
  const value = sort ? `${sort.key}:${sort.direction}` : "";
  return (
    <FormField label="Sort by" htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={(e) => {
          const [key, direction] = e.target.value.split(":");
          onSortChange(key ? { key, direction: direction === "desc" ? "desc" : "asc" } : null);
        }}
      >
        <option value="">Default order</option>
        {options.flatMap((o) => {
          const [asc, desc] = directionLabels[o.kind];
          return [
            <option key={`${o.key}:asc`} value={`${o.key}:asc`}>{`${o.label}: ${asc}`}</option>,
            <option key={`${o.key}:desc`} value={`${o.key}:desc`}>{`${o.label}: ${desc}`}</option>,
          ];
        })}
      </Select>
    </FormField>
  );
}

/** A labelled block in the filter sheet for controls that aren't a single field (status segments, a chip). */
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-small font-semibold text-text-primary">{label}</span>
      {children}
    </div>
  );
}
