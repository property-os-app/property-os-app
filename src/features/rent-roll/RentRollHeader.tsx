import type { ReactNode } from "react";
import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button, Select } from "@/components/atoms";
import { FormField, SearchInput } from "@/components/molecules";
import { PageHeader, Toolbar } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/lib/useIsMobile";
import { useProperties } from "@/features/properties/hooks";
import { RentRollViewSwitch } from "@/features/rent-roll/RentRollViewSwitch";
import type { RentRollView } from "@/features/rent-roll/yearStats";
import { useScope } from "@/features/scope/scopeContext";
import { MobileFilters } from "@/features/shared/MobileFilters";

export interface PeriodPickerProps {
  /** "November 2026" or "2026". */
  label: string;
  /** "month" or "year": used in the arrows' names and the button's tooltip. */
  unit: "month" | "year";
  isCurrent: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCurrent: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

/**
 * ‹ label › with the middle button back to the current period. The middle button has a fixed minimum width (fits
 * "September 2026"), so a month and a year take the same space and nothing moves when the view changes.
 */
export function PeriodPicker({ label, unit, isCurrent, onPrev, onNext, onCurrent, prevDisabled, nextDisabled }: PeriodPickerProps) {
  const isMobile = useIsMobile();
  return (
    <div className={cn("flex items-center gap-1", isMobile && "w-full")}>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label={`Previous ${unit}`}
        disabled={prevDisabled}
        icon={<ChevronLeft size={16} strokeWidth={1.5} />}
        onClick={onPrev}
      />
      <Button
        className={cn(isMobile ? "h-11 flex-1" : "min-w-44")}
        icon={<Calendar size={16} strokeWidth={1.5} />}
        title={isCurrent ? undefined : `Back to the current ${unit}`}
        onClick={onCurrent}
      >
        {label}
      </Button>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label={`Next ${unit}`}
        disabled={nextDisabled}
        icon={<ChevronRight size={16} strokeWidth={1.5} />}
        onClick={onNext}
      />
    </div>
  );
}

/** The Property select: the app-wide scope (useScope), "All properties" first. */
export function RentRollPropertySelect({ id }: { id?: string }) {
  const { propertyId: scope, setPropertyId } = useScope();
  const properties = useProperties();
  return (
    <Select id={id} aria-label={id ? undefined : "Property"} value={scope ?? "all"} onChange={(e) => setPropertyId(e.target.value === "all" ? null : e.target.value)}>
      <option value="all">All properties</option>
      {properties.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

export interface RentRollHeaderProps {
  view: RentRollView;
  /** The view's month ("YYYY-MM") or year ("YYYY"), for the Month | Year switch. */
  period: string;
  /** One line (cut with "…" when it doesn't fit). */
  description: string;
  picker: PeriodPickerProps;
  export: { onClick: () => void; disabled: boolean; title: string };
  /** Month: Record Payment. Desktop: left of the switch (the other buttons keep their place); phones: shares the Export row. */
  primaryAction?: (className: string) => ReactNode;
  search: { value: string; onChange: (value: string) => void };
  /** Desktop row 2, after search and Property: the view's own chips and controls. */
  controls: ReactNode;
  /** Phones: the Filters sheet. `before` goes above the Property field, `after` below it. */
  filters: { count: number; resultCount?: number; onClear: () => void; before?: ReactNode; after?: ReactNode };
}

/**
 * The Rent Roll header shared by the Month and Year views, so switching only changes the content, never where the controls are.
 * Row 1: title and a one-line description; Record Payment (month), the Month | Year switch, the period picker, Export CSV.
 * Row 2 (desktop): search and Property at fixed widths, then the view's `controls`. Phones: the switch, the picker and the
 * Export row stacked, then search + Filters (the sheet holds the view's filters and Property). The KPIs come after this, in each view.
 */
export function RentRollHeader({ view, period, description, picker, export: exp, primaryAction, search, controls, filters }: RentRollHeaderProps) {
  const isMobile = useIsMobile();
  const exportButton = (className?: string) => (
    <Button className={className} icon={<Download size={16} strokeWidth={1.5} />} disabled={exp.disabled} onClick={exp.onClick} aria-label="Export CSV" title={exp.title}>
      Export CSV
    </Button>
  );
  const searchBox = (
    <SearchInput
      containerClassName={cn(!isMobile && "w-72 flex-none")}
      placeholder="Search tenant, unit or lease number"
      value={search.value}
      onChange={(e) => search.onChange(e.target.value)}
    />
  );

  return (
    <>
      <PageHeader
        title="Rent Roll"
        description={description}
        singleLineDescription
        actions={
          isMobile ? (
            <div className="flex w-full flex-col gap-3">
              <RentRollViewSwitch view={view} period={period} />
              <PeriodPicker {...picker} />
              <div className="flex gap-3">
                {primaryAction?.("h-11 flex-1")}
                {exportButton("h-11 flex-1")}
              </div>
            </div>
          ) : (
            <>
              {primaryAction?.("")}
              <RentRollViewSwitch view={view} period={period} />
              <PeriodPicker {...picker} />
              {exportButton()}
            </>
          )
        }
      />

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {searchBox}
          <MobileFilters count={filters.count} resultCount={filters.resultCount} onClear={filters.onClear}>
            {filters.before}
            <FormField label="Property (all pages)" htmlFor="rent-roll-property">
              <RentRollPropertySelect id="rent-roll-property" />
            </FormField>
            {filters.after}
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {/* self-start: at the top of the line whatever the view's controls are (a 42px switch would centre them 1px lower). */}
          <div className="flex items-center gap-3 self-start">
            {searchBox}
            <div className="w-52 shrink-0">
              <RentRollPropertySelect />
            </div>
          </div>
          {controls}
        </Toolbar>
      )}
    </>
  );
}
