import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Maximize } from "lucide-react";
import { Button } from "@/components/atoms";
import { ColumnsMenu, FilterChip, InlineError, SegmentedControl, toast } from "@/components/molecules";
import { PageHeader } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { currentMonthUTC } from "@/lib/format";
import { cn } from "@/lib/cn";
import { accentOrderOf } from "@/lib/groupAccent";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { RecordPaymentModal } from "@/features/ledger/RecordPaymentModal";
import { useAddPropertyFlow } from "@/features/properties/AddPropertyFlow";
import { useProperties } from "@/features/properties/hooks";
import { useRentRoll, useRentRollYear } from "@/features/rent-roll/hooks";
import { RentRollHeader } from "@/features/rent-roll/RentRollHeader";
import { downloadYearCsv, yearCsvFilename } from "@/features/rent-roll/yearCsv";
import { YearCards } from "@/features/rent-roll/YearCards";
import { YearFullscreen } from "@/features/rent-roll/YearFullscreen";
import { paymentTargets } from "@/features/rent-roll/stats";
import { useYearFullscreen } from "@/features/rent-roll/useYearFullscreen";
import { YearLegend } from "@/features/rent-roll/YearLegend";
import { YearSummary } from "@/features/rent-roll/YearSummary";
import { YearTable } from "@/features/rent-roll/YearTable";
import { unitPathFromRentRoll, type UnitPageState } from "@/features/units/origin";
import {
  chipsFromParam,
  currentYearUTC,
  filterYearRows,
  groupByProperty,
  matchesChips,
  MIN_YEAR,
  OUTDATED_BACKEND_DESCRIPTION,
  OUTDATED_BACKEND_TITLE,
  rowsByLabels,
  rowsFromParam,
  rowsSwitchParams,
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
import { FilterGroup } from "@/features/shared/MobileFilters";
import { NoProperties } from "@/features/shared/NoProperties";
import type { LeasePageState } from "@/features/leases/LeasePage";
import type { RentRollYearRow, RentRollYearRowsBy } from "@/types/rentRoll";

/** The note under the table / cards while a search or chip hides rows (the totals are the API's, for every row). */
const FILTERED_TOTALS_NOTE = "Totals include all units in scope, not just the filtered rows.";

/**
 * /rent-roll?view=year&year=YYYY: the client's spreadsheet rent roll from GET /rent-roll/year. The shared RentRollHeader (same
 * layout as the Month view): Record Payment, Month | Year switch, year picker (limited to `availableYears`), Export CSV (the whole year for the
 * scope); search, Property (the app-wide scope), then chips Ends soon / Unpaid months / Vacant (?q= and ?chips= in the URL), Columns menu (saved per browser).
 * A "By unit | By tenant" switch (?rows=lease; unit is the default and isn't written): one row per unit (its current tenant)
 * or one per lease (a unit that changed tenants shows twice, older first). Then the summary cards (YearSummary) and the
 * colour key. Desktop: YearTable, with a Full screen button (YearFullscreen: the same table over the whole window); phones: YearCards. A row opens its lease (back returns to this year); a vacant / reserved
 * unit the Unit drawer. A response of unknown shape (older backend) shows "This page needs the latest backend" instead.
 */
export function RentRollYearView() {
  const { me } = useAuth();
  const canPay = can(me!, "payment.create");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { propertyId: scope } = useScope();
  const properties = useProperties();
  const addProperty = useAddPropertyFlow();

  const [params, setParams] = useSearchParams();
  const year = yearFromParam(params.get("year"));
  const chipsParam = params.get("chips");
  const chips = useMemo(() => chipsFromParam(chipsParam), [chipsParam]);
  const rowsBy = rowsFromParam(params.get("rows"));
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
  // A summary card shows its rows: adds that chip (keeps the others).
  const showChip = (chip: YearChip) => {
    if (!chips.includes(chip)) toggleChip(chip);
  };
  // Like a filter: replaces the history entry and keeps the scroll position.
  const setRowsBy = (next: RentRollYearRowsBy) => setParams((prev) => rowsSwitchParams(prev, next), { replace: true, preventScrollReset: true });
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
  const query = useRentRollYear(year, scope, rowsBy);
  // Record Payment: the current month's leases and balances, the same request as the Month view (whatever year is shown).
  const currentMonth = useRentRoll(currentMonthUTC(), scope, { enabled: canPay });
  const targets = useMemo(() => paymentTargets(currentMonth.data?.rows ?? []), [currentMonth.data]);
  const [paying, setPaying] = useState(false);
  // null: the response isn't a shape this page knows (older backend).
  const outdated = query.isSuccess && query.data === null;
  const data = query.data ?? undefined;
  const rows = useMemo((): RentRollYearRow[] => data?.rows ?? [], [data]);
  const filtered = useMemo(() => filterYearRows(rows, search, chips), [rows, search, chips]);
  const groups = useMemo(() => groupByProperty(filtered, data?.propertyTotals ?? []), [filtered, data]);
  const chipCounts = useMemo(() => Object.fromEntries(YEAR_CHIPS.map((c) => [c, rows.filter((r) => matchesChips(r, [c])).length])) as Record<YearChip, number>, [rows]);
  const isFiltered = search.trim() !== "" || chips.length > 0;

  // Band colours by the full property list by name, then id (the groups' order, so neighbours differ): independent of the filters, same on every view.
  const accentOrder = useMemo(() => accentOrderOf(properties.data ?? []), [properties.data]);

  // A row opens its lease on the Ledger tab (by unit: the current one); vacant / reserved units the unit page. Both keep the year in the URL.
  const openLease = (leaseId: string) => void navigate(yearLeasePath(leaseId, year, "ledger"), { state: { from: "rent-roll" } satisfies LeasePageState });
  const onOpen = (r: RentRollYearRow) => {
    if (r.lease) openLease(r.lease.id);
    else void navigate(unitPathFromRentRoll(r.unit.id, String(year)), { state: { from: "rent-roll" } satisfies UnitPageState });
  };

  // Full screen (desktop table only): same data, filters and columns; opening a lease or a unit page leaves it.
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const fullscreen = useYearFullscreen(fullscreenButton);

  const state: "loading" | "error" | "empty" | "ideal" = query.isError ? "error" : query.isPending ? "loading" : filtered.length === 0 ? "empty" : "ideal";
  const empty =
    rows.length === 0
      ? {
          title: `No units in ${year}`,
          description: "Every unit in scope shows here, with or without a lease. Add units to see them.",
          action: <Button onClick={() => void navigate("/units")}>Go to Units</Button>,
        }
      : {
          title: rowsBy === "lease" ? "No tenants or units match your filters" : "No units match your filters",
          description: "Try another search or chip.",
          action: <Button onClick={clearFilters}>Clear filters</Button>,
        };
  const error = { title: `Couldn't load the ${year} rent roll`, description: query.isError ? errorText(query.error) : undefined, onRetry: () => void query.refetch() };

  // The picker's range: the API's availableYears once loaded, else the API's own limits.
  const fromYear = data?.availableYears.from ?? MIN_YEAR;
  const toYear = data?.availableYears.to ?? currentYearUTC() + 1;
  const thisYear = currentYearUTC();
  const scopeName = scope ? (properties.data?.find((p) => p.id === scope)?.name ?? null) : null;

  const exportCsv = () => {
    if (!data) return;
    downloadYearCsv(data, scopeName);
    toast.success(`Downloaded ${yearCsvFilename(data.year, scopeName, data.rowsBy)}`);
  };
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
  const rowsSwitch = (
    <SegmentedControl<RentRollYearRowsBy>
      aria-label="Rows"
      value={rowsBy}
      onChange={setRowsBy}
      segments={(["unit", "lease"] as const).map((v) => ({ value: v, label: rowsByLabels[v] }))}
      className={cn(isMobile && "w-full [&>button]:h-9 [&>button]:flex-1 [&>button]:justify-center")}
    />
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
      <RentRollHeader
        view="year"
        period={String(year)}
        description={`Every unit in ${year}, month by month.`}
        picker={{
          label: String(year),
          unit: "year",
          isCurrent: year === thisYear,
          onPrev: () => setYear(year - 1),
          onNext: () => setYear(year + 1),
          onCurrent: () => setYear(thisYear),
          prevDisabled: year <= fromYear,
          nextDisabled: year >= toYear,
        }}
        export={{
          onClick: exportCsv,
          disabled: !data || rows.length === 0,
          title: scope ? "Exports the whole year for the selected property" : "Exports the whole year for all properties",
        }}
        recordPayment={
          canPay
            ? { onClick: () => setPaying(true), disabled: targets.length === 0, title: currentMonth.isError ? "Couldn't load the tenants. Reload the page to try again." : undefined }
            : undefined
        }
        search={{ value: search, onChange: setSearch }}
        controls={
          <>
            {chipRow}
            {rowsSwitch}
            {/* ml-auto: stays at the right edge even when the toolbar wraps, so its right-aligned panel stays on screen. */}
            <ColumnsMenu className="ml-auto" options={[...YEAR_OPTIONAL_COLUMNS]} visible={columns.visible} onToggle={columns.toggle} onReset={columns.reset} />
            {!outdated && (
              <Button ref={fullscreenButton} icon={<Maximize size={16} strokeWidth={1.5} />} onClick={fullscreen.open}>
                Full screen
              </Button>
            )}
          </>
        }
        filters={{
          count: chips.length,
          resultCount: query.isSuccess ? filtered.length : undefined,
          onClear: () => setChips([]),
          before: <FilterGroup label="Show only">{chipRow}</FilterGroup>,
        }}
      />

      {outdated ? (
        <InlineError title={OUTDATED_BACKEND_TITLE} description={OUTDATED_BACKEND_DESCRIPTION} />
      ) : (
        <>
          <YearSummary data={data} year={year} isError={query.isError} onShow={showChip} />

          <YearLegend />

          {isMobile ? (
            <>
              {/* Phones: below the summary cards, just above the property cards, so the KPIs sit where the Month view's do. */}
              <div className="mb-4">{rowsSwitch}</div>
              <YearCards data={data} groups={groups} year={year} state={state} empty={empty} error={error} note={note} onOpen={onOpen} accentOrder={accentOrder} />
            </>
          ) : (
            <YearTable
              data={data}
              groups={groups}
              year={year}
              rowsBy={rowsBy}
              visible={columns.visible}
              state={state}
              empty={empty}
              error={error}
              footer={note}
              onOpen={onOpen}
              accentOrder={accentOrder}
            />
          )}
        </>
      )}

      {fullscreen.isOpen && !isMobile && !outdated && (
        <YearFullscreen year={year} onClose={fullscreen.close}>
          <YearTable
            data={data}
            groups={groups}
            year={year}
            rowsBy={rowsBy}
            visible={columns.visible}
            state={state}
            empty={empty}
            error={error}
            footer={note}
            onOpen={onOpen}
            accentOrder={accentOrder}
            fill
          />
        </YearFullscreen>
      )}

      {paying && <RecordPaymentModal targets={targets} onClose={() => setPaying(false)} />}
    </>
  );
}
