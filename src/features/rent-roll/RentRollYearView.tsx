import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Calendar, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button, Select } from "@/components/atoms";
import { ColumnsMenu, FilterChip, FormField, SearchInput, toast } from "@/components/molecules";
import { PageHeader, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { useProperties } from "@/features/properties/hooks";
import { useRentRollYear } from "@/features/rent-roll/hooks";
import { RentRollViewSwitch } from "@/features/rent-roll/RentRollViewSwitch";
import { downloadYearCsv, yearCsvFilename } from "@/features/rent-roll/yearCsv";
import { YearCards } from "@/features/rent-roll/YearCards";
import { YearLegend } from "@/features/rent-roll/YearLegend";
import { YearTable } from "@/features/rent-roll/YearTable";
import { YearUnitDrawer } from "@/features/rent-roll/YearUnitDrawer";
import {
  chipsFromParam,
  currentYearUTC,
  filterYearRows,
  groupByProperty,
  matchesChips,
  MIN_YEAR,
  YEAR_CHIPS,
  YEAR_OPTIONAL_COLUMNS,
  YEAR_OPTIONAL_KEYS,
  yearChipLabels,
  yearFromParam,
  yearLeasePath,
  type YearChip,
} from "@/features/rent-roll/yearStats";
import { useScope } from "@/features/scope/scopeContext";
import { useColumnVisibility } from "@/features/shared/columnVisibility";
import { FilterGroup, MobileFilters } from "@/features/shared/MobileFilters";
import { NoProperties } from "@/features/shared/NoProperties";
import type { LeasePageState } from "@/features/leases/LeasePage";
import type { RentRollYearRow } from "@/types/rentRoll";

/** The note under the table / cards while a search or chip hides rows (the totals are the API's, for every row). */
const FILTERED_TOTALS_NOTE = "Totals include all units in scope, not just the filtered rows.";

/**
 * /rent-roll?view=year&year=YYYY: the client's spreadsheet rent roll from GET /rent-roll/year. Header: Month | Year switch,
 * year picker (limited to `availableYears`), Export CSV (the whole year for the scope). Toolbar: search, Property (the app-wide
 * scope), chips Ends soon / Unpaid months / Vacant (?q= and ?chips= in the URL), Columns menu (saved per browser).
 * Desktop: YearTable; phones: YearCards. A lease row opens its lease page (back returns to this year); a vacant row the Unit drawer.
 */
export function RentRollYearView() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { propertyId: scope, setPropertyId } = useScope();
  const properties = useProperties();
  const addProperty = useAddPropertyFlow();

  const [params, setParams] = useSearchParams();
  const year = yearFromParam(params.get("year"));
  const chipsParam = params.get("chips");
  const chips = useMemo(() => chipsFromParam(chipsParam), [chipsParam]);
  const urlSearch = params.get("q") ?? "";
  // The box shows typing at once; the URL follows (replace, so Back skips keystrokes).
  const [search, setSearchState] = useState(urlSearch);
  const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
  if (urlSearch !== seenUrlSearch) {
    // Changed from outside (Back, Clear filters): show it.
    setSeenUrlSearch(urlSearch);
    setSearchState(urlSearch);
  }
  const writeParams = (change: (p: URLSearchParams) => void) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        change(out);
        return out;
      },
      { replace: true, preventScrollReset: true },
    );
  const setSearch = (value: string) => {
    setSearchState(value);
    setSeenUrlSearch(value.trim());
    writeParams((p) => (value.trim() ? p.set("q", value.trim()) : p.delete("q")));
  };
  const setChips = (next: YearChip[]) => writeParams((p) => (next.length ? p.set("chips", next.join(",")) : p.delete("chips")));
  const toggleChip = (chip: YearChip) => setChips(chips.includes(chip) ? chips.filter((c) => c !== chip) : YEAR_CHIPS.filter((c) => c === chip || chips.includes(c)));
  const clearFilters = () =>
    writeParams((p) => {
      p.delete("q");
      p.delete("chips");
    });
  // A new year is a new history entry (Back returns to the previous year), keeping the scroll position.
  const setYear = (next: number) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set("view", "year");
        out.set("year", String(next));
        return out;
      },
      { preventScrollReset: true },
    );

  const columns = useColumnVisibility("rent-roll-year", YEAR_OPTIONAL_KEYS, []);
  const query = useRentRollYear(year, scope);
  const data = query.data;
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const filtered = useMemo(() => filterYearRows(rows, search, chips), [rows, search, chips]);
  const groups = useMemo(() => groupByProperty(filtered, data?.propertyTotals ?? []), [filtered, data]);
  const chipCounts = useMemo(() => Object.fromEntries(YEAR_CHIPS.map((c) => [c, rows.filter((r) => matchesChips(r, [c])).length])) as Record<YearChip, number>, [rows]);
  const isFiltered = search.trim() !== "" || chips.length > 0;

  const [openUnit, setOpenUnit] = useState<{ id: string; unitNumber: string; propertyName: string } | null>(null);
  const onOpen = (r: RentRollYearRow) => {
    if (r.lease) void navigate(yearLeasePath(r.lease.id, year, "ledger"), { state: { from: "rent-roll" } satisfies LeasePageState });
    else setOpenUnit({ id: r.unit.id, unitNumber: r.unit.unitNumber, propertyName: r.unit.property.name });
  };

  const state: "loading" | "error" | "empty" | "ideal" = query.isError ? "error" : query.isPending ? "loading" : filtered.length === 0 ? "empty" : "ideal";
  const empty =
    rows.length === 0
      ? {
          title: `No units in ${year}`,
          description: "Every unit in scope shows here, with or without a lease. Add units to see them.",
          action: <Button onClick={() => void navigate("/units")}>Go to Units</Button>,
        }
      : { title: "No rows match your filters", description: "Try another search or chip.", action: <Button onClick={clearFilters}>Clear filters</Button> };
  const error = { title: `Couldn't load the ${year} rent roll`, description: query.isError ? errorText(query.error) : undefined, onRetry: () => void query.refetch() };

  // The picker's range: the API's availableYears once loaded, else the API's own limits.
  const fromYear = data?.availableYears.from ?? MIN_YEAR;
  const toYear = data?.availableYears.to ?? currentYearUTC() + 1;
  const thisYear = currentYearUTC();
  const scopeName = scope ? (properties.data?.find((p) => p.id === scope)?.name ?? null) : null;

  const exportCsv = () => {
    if (!data) return;
    downloadYearCsv(data, scopeName);
    toast.success(`Downloaded ${yearCsvFilename(data.year, scopeName)}`);
  };
  const exportButton = (className?: string) => (
    <Button
      className={className}
      icon={<Download size={16} strokeWidth={1.5} />}
      disabled={!query.isSuccess || rows.length === 0}
      onClick={exportCsv}
      aria-label="Export CSV"
      title={scope ? "Exports the whole year for the selected property" : "Exports the whole year for all properties"}
    >
      Export CSV
    </Button>
  );

  const yearPicker = (
    <div className={cn("flex items-center gap-1", isMobile && "w-full")}>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label="Previous year"
        disabled={year <= fromYear}
        icon={<ChevronLeft size={16} strokeWidth={1.5} />}
        onClick={() => setYear(year - 1)}
      />
      <Button
        className={cn(isMobile && "h-11 flex-1")}
        icon={<Calendar size={16} strokeWidth={1.5} />}
        title={year === thisYear ? undefined : "Back to the current year"}
        onClick={() => setYear(thisYear)}
      >
        {year}
      </Button>
      <Button
        variant="ghost"
        iconOnly
        className={cn(isMobile && "size-11")}
        aria-label="Next year"
        disabled={year >= toYear}
        icon={<ChevronRight size={16} strokeWidth={1.5} />}
        onClick={() => setYear(year + 1)}
      />
    </div>
  );

  // At least 240px on desktop, so the chips and Property select don't squeeze it.
  const searchBox = (
    <SearchInput
      containerClassName={cn(!isMobile && "min-w-60")}
      placeholder="Search tenant, unit or lease number"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
  const chipRow = (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
      {YEAR_CHIPS.map((c) => (
        <FilterChip
          key={c}
          active={chips.includes(c)}
          aria-pressed={chips.includes(c)}
          count={query.isSuccess ? chipCounts[c] : undefined}
          countTone={c === "unpaid" && chipCounts[c] > 0 ? "danger" : "neutral"}
          onClick={() => toggleChip(c)}
          className="max-md:min-h-11"
        >
          {yearChipLabels[c]}
        </FilterChip>
      ))}
    </div>
  );
  const propertySelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Property"} value={scope ?? "all"} onChange={(e) => setPropertyId(e.target.value === "all" ? null : e.target.value)}>
      <option value="all">All properties</option>
      {properties.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );

  if (properties.data?.length === 0) {
    return (
      <>
        <PageHeader title="Rent Roll" />
        <NoProperties onAdd={addProperty.open} />
        {addProperty.modals}
      </>
    );
  }

  const note: ReactNode = state === "ideal" && isFiltered ? FILTERED_TOTALS_NOTE : undefined;

  return (
    <>
      <PageHeader
        title="Rent Roll"
        description={`Every lease and unit in ${year}, month by month. Cells show the amount paid, coloured by rent status.`}
        actions={
          isMobile ? (
            <div className="flex w-full flex-col gap-3">
              <RentRollViewSwitch view="year" period={String(year)} />
              {yearPicker}
              {exportButton("h-11 w-full")}
            </div>
          ) : (
            <>
              <RentRollViewSwitch view="year" period={String(year)} />
              {yearPicker}
              {exportButton()}
            </>
          )
        }
      />

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {searchBox}
          <MobileFilters count={chips.length} resultCount={query.isSuccess ? filtered.length : undefined} onClear={() => setChips([])}>
            <FilterGroup label="Show only">{chipRow}</FilterGroup>
            <FormField label="Property (all pages)" htmlFor="rent-roll-year-property">
              {propertySelect("rent-roll-year-property")}
            </FormField>
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          {searchBox}
          <div className="w-52">{propertySelect()}</div>
          {chipRow}
          {/* ml-auto: stays at the right edge even when the toolbar wraps, so its right-aligned panel stays on screen. */}
          <ColumnsMenu className="ml-auto" options={[...YEAR_OPTIONAL_COLUMNS]} visible={columns.visible} onToggle={columns.toggle} onReset={columns.reset} />
        </Toolbar>
      )}

      <YearLegend />

      {isMobile ? (
        <YearCards data={data} groups={groups} year={year} state={state} empty={empty} error={error} note={note} onOpen={onOpen} />
      ) : (
        <YearTable data={data} groups={groups} year={year} visible={columns.visible} state={state} empty={empty} error={error} footer={note} onOpen={onOpen} />
      )}

      {openUnit && <YearUnitDrawer unitId={openUnit.id} unitNumber={openUnit.unitNumber} propertyName={openUnit.propertyName} onClose={() => setOpenUnit(null)} />}
    </>
  );
}
