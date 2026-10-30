import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button, Caption, Checkbox, Dash, Input, Select, Skeleton } from "@/components/atoms";
import { FilterChip, FormField, KpiCard, SearchInput } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCurrency, formatPercent, todayISO } from "@/lib/format";
import { expenseStatusLabels, plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { serverPageSummary, useServerTable } from "@/lib/useServerTable";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { CategoryBreakdown } from "@/features/expenses/CategoryBreakdown";
import { monthsInRange, RANGE_PRESETS, rangeLabel, rangePresetLabels, type RangePreset } from "@/features/expenses/dateRange";
import { ExpenseDrawer } from "@/features/expenses/ExpenseDrawer";
import { ExpenseFormModal } from "@/features/expenses/ExpenseFormModal";
import {
  activeExpenseFilterCount,
  DEFAULT_EXPENSE_SORT,
  EXPENSE_PAGE_SIZE,
  EXPENSE_SORT_KEYS,
  EXPENSE_STATUSES,
  expenseFilterValues,
  expenseQuery,
  expenseRange,
  expenseSummaryQuery,
  initialExpenseFilters,
  isPortfolioOnly,
  type ExpenseFilters,
} from "@/features/expenses/expenseQuery";
import { ExpensesTable } from "@/features/expenses/ExpensesTable";
import { useCategoryLabel, useExpenseCategories, useExpenses, useExpenseSummary } from "@/features/expenses/hooks";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { useListView } from "@/features/shared/listView";
import { ViewToggle } from "@/features/shared/ViewToggle";
import { useVendors } from "@/features/vendors/hooks";

/** The drawer's query key: /expenses?expense=<id> opens it (also from the vendor drawer). */
const OPEN_KEY = "expense";
const PORTFOLIO_OPTION = "portfolio";

const sortOptions: SortOption[] = [
  { key: "date", label: "Date", kind: "date" },
  { key: "amount", label: "Amount", kind: "money" },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * /expenses: KPIs (GET /expenses/summary for the date range and property), filters, the paginated list (GET /expenses,
 * server-side search, filters, sort and paging, all in the URL) with a "Total, filtered" row, and "By category".
 * The Property filter is the sidebar scope, plus "Portfolio-wide only" for the Owner. Buttons come from allowedActions;
 * "Add Expense" needs expenses.record.
 */
export function ExpensesPage() {
  const { me } = useAuth();
  const user = me!;
  const isOwner = user.role === "OWNER";
  const canRecord = can(user, "expense.record");
  const { propertyId: scope, setPropertyId } = useScope();
  const properties = useProperties();
  const categories = useExpenseCategories();
  const categoryLabel = useCategoryLabel();
  const vendors = useVendors();
  const isMobile = useIsMobile();
  const [view, setView] = useListView("expenses", "table");
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const today = todayISO();

  const table = useServerTable<ExpenseFilters>({
    initialFilters: initialExpenseFilters,
    filterValues: expenseFilterValues({ isOwner, categories: categories.data?.map((c) => c.key), vendors: vendors.data?.map((v) => v.id) }),
    sortKeys: EXPENSE_SORT_KEYS,
    initialSort: DEFAULT_EXPENSE_SORT,
  });
  const { filters } = table;
  const portfolio = isPortfolioOnly(filters, isOwner);
  const range = expenseRange(filters, today);
  const period = rangeLabel(filters.range, range);

  const list = useExpenses(expenseQuery({ search: table.savedSearch, filters, sort: table.sort, page: table.page, scope, isOwner, today }));
  const summary = useExpenseSummary(expenseSummaryQuery({ filters, scope, isOwner, today }));

  // A deep link past the last page (or rows removed meanwhile): go to the last page.
  const totalPages = list.data?.totalPages ?? 0;
  const { setPage } = table;
  useEffect(() => {
    if (totalPages > 0 && table.page > totalPages) setPage(totalPages);
  }, [totalPages, table.page, setPage]);

  const openId = params.get(OPEN_KEY);
  const setOpen = (id: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set(OPEN_KEY, id);
        else next.delete(OPEN_KEY);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const rows = list.data?.items ?? [];
  const state: "loading" | "error" | "empty" | "ideal" = list.isError && !list.data ? "error" : list.isPending ? "loading" : rows.length === 0 ? "empty" : "ideal";
  const filterCount = activeExpenseFilterCount(filters);
  const scopeName = scope ? properties.data?.find((p) => p.id === scope)?.name : undefined;

  const addButton = (variant: "primary" | "secondary") =>
    canRecord ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAdding(true)}>
        Add Expense
      </Button>
    ) : undefined;

  const empty = table.isFiltered
    ? { title: "No expenses match your filters", description: "Try another search, filter or date range.", action: <Button onClick={table.clearFilters}>Clear filters</Button> }
    : {
        title: `No expenses ${period === "year to date" ? "this year" : `for ${period}`}`,
        description: scope ? "Nothing recorded for this property in this period. Choose All properties to see everything." : "Record what you spend on your properties to track it here.",
        action: addButton("secondary"),
      };
  const error = { title: "Couldn't load expenses", description: list.isError ? errorText(list.error) : undefined, onRetry: () => void list.refetch() };
  const pagination =
    list.data && totalPages > 1 ? (
      <Pagination page={table.page} pageCount={totalPages} onPageChange={table.setPage} summary={serverPageSummary(table.page, EXPENSE_PAGE_SIZE, list.data.totalItems)} />
    ) : undefined;

  // KPIs
  const s = summary.data;
  const kpi = (value: ReactNode) => (s ? value : summary.isError ? <Dash /> : <Skeleton className="h-10 w-24" />);
  const months = s ? monthsInRange({ from: s.from, to: s.to }) : 0;
  const change = s?.changePercent ?? null;

  // Filters
  const setPreset = (preset: RangePreset) =>
    preset === "custom" ? table.setFilters({ range: "custom", from: range.from, to: range.to }) : table.setFilters({ range: preset, from: "", to: "" });
  const pendingOn = filters.status === "PENDING_APPROVAL";

  const search = <SearchInput placeholder="Search expenses" aria-label="Search description, vendor, number or reference" value={table.search} onChange={(e) => table.setSearch(e.target.value)} />;
  const propertySelect = (id?: string) => (
    <Select
      id={id}
      aria-label={id ? undefined : "Property"}
      value={portfolio ? PORTFOLIO_OPTION : (scope ?? "all")}
      onChange={(e) => {
        const v = e.target.value;
        if (v === PORTFOLIO_OPTION) return table.setFilter("portfolio", "1");
        setPropertyId(v === "all" ? null : v);
        if (filters.portfolio === "1") table.setFilter("portfolio", "0");
      }}
    >
      <option value="all">All properties</option>
      {isOwner && <option value={PORTFOLIO_OPTION}>Portfolio-wide only</option>}
      {properties.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
  const categorySelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Category"} value={filters.category} onChange={(e) => table.setFilter("category", e.target.value)}>
      <option value="all">All categories</option>
      {categories.data?.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label}
        </option>
      ))}
    </Select>
  );
  const vendorSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Vendor"} value={filters.vendor} onChange={(e) => table.setFilter("vendor", e.target.value)}>
      <option value="all">All vendors</option>
      {vendors.data?.map((v) => (
        <option key={v.id} value={v.id}>
          {v.archivedAt ? `${v.name} (archived)` : v.name}
        </option>
      ))}
    </Select>
  );
  const statusSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Status"} value={filters.status} onChange={(e) => table.setFilter("status", e.target.value as ExpenseFilters["status"])}>
      <option value="all">All statuses</option>
      {EXPENSE_STATUSES.map((st) => (
        <option key={st} value={st}>
          {expenseStatusLabels[st]}
        </option>
      ))}
    </Select>
  );
  const rangeSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Date range"} value={filters.range} onChange={(e) => setPreset(e.target.value as RangePreset)}>
      {RANGE_PRESETS.map((p) => (
        <option key={p} value={p}>
          {rangePresetLabels[p]}
        </option>
      ))}
    </Select>
  );
  const customDates = (idPrefix: string) =>
    filters.range === "custom" ? (
      <div className="flex items-center gap-2">
        <Input id={`${idPrefix}-from`} type="date" aria-label="From" value={filters.from} max={filters.to || undefined} onChange={(e) => table.setFilter("from", e.target.value)} />
        <span className="text-small text-text-secondary">to</span>
        <Input id={`${idPrefix}-to`} type="date" aria-label="To" value={filters.to} min={filters.from || undefined} onChange={(e) => table.setFilter("to", e.target.value)} />
      </div>
    ) : null;
  const pendingChip = (
    <FilterChip
      active={pendingOn}
      aria-pressed={pendingOn}
      count={s?.pending.count}
      countTone={s && s.pending.count > 0 ? "danger" : "neutral"}
      onClick={() => table.setFilter("status", pendingOn ? "all" : "PENDING_APPROVAL")}
      onRemove={() => table.setFilter("status", "all")}
      className={isMobile ? "min-h-11 px-4" : undefined}
    >
      Pending approval
    </FilterChip>
  );
  const voidedToggle = <Checkbox label="Include voided" checked={filters.voided === "1"} onChange={(e) => table.setFilter("voided", e.target.checked ? "1" : "0")} />;

  const placeholder = rows.find((r) => r.id === openId);

  return (
    <>
      <PageHeader
        title="Expenses"
        description={`${portfolio ? "Portfolio-wide expenses" : `Operating expenses across ${scopeName ?? "every property"} and category`}, ${period}.`}
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard
          label={`Total, ${period}`}
          value={kpi(s ? formatCurrency(s.total) : null)}
          delta={s ? { direction: "flat", label: change === null ? "–" : `${change > 0 ? "+" : ""}${formatPercent(change)}` } : undefined}
          note={s ? "vs same period last year" : undefined}
        />
        <KpiCard
          label="Largest category"
          value={kpi(s ? (s.largestCategory ? <span className="block text-h1">{categoryLabel(s.largestCategory.category)}</span> : <Dash />) : null)}
          note={s ? (s.largestCategory ? `${formatPercent(s.largestCategory.percent)} of the total · ${formatCurrency(s.largestCategory.total)}` : "No approved expenses yet") : undefined}
        />
        <KpiCard label="Average monthly" value={kpi(s ? formatCurrency(s.averageMonthly) : null)} note={s ? `over ${plural(months, "month")}` : undefined} />
        <KpiCard
          label="Pending approvals"
          tone={s && s.pending.count > 0 ? "warning" : "default"}
          value={kpi(s ? s.pending.count : null)}
          note={s ? (s.pending.count > 0 ? `${formatCurrency(s.pending.total)} awaiting approval` : "Nothing waiting") : undefined}
          onClick={s && s.pending.count > 0 ? () => table.setFilter("status", "PENDING_APPROVAL") : undefined}
        />
      </KpiRow>
      {portfolio && <Caption>The cards cover every property: the summary can't be limited to portfolio-wide expenses yet.</Caption>}

      {isMobile ? (
        <Toolbar className="flex-nowrap">
          {search}
          <MobileFilters count={filterCount} resultCount={list.data?.totalItems} onClear={table.resetFilters}>
            <FormField label="Property (all pages)" htmlFor="expenses-property">
              {propertySelect("expenses-property")}
            </FormField>
            <FormField label="Date range" htmlFor="expenses-range">
              {rangeSelect("expenses-range")}
            </FormField>
            {customDates("expenses-m")}
            <FormField label="Category" htmlFor="expenses-category">
              {categorySelect("expenses-category")}
            </FormField>
            <FormField label="Vendor" htmlFor="expenses-vendor">
              {vendorSelect("expenses-vendor")}
            </FormField>
            <FormField label="Status" htmlFor="expenses-status">
              {statusSelect("expenses-status")}
            </FormField>
            <FilterGroup label="Voided">{voidedToggle}</FilterGroup>
            <SortSelect id="expenses-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
          </MobileFilters>
        </Toolbar>
      ) : (
        <Toolbar>
          <div className="w-72">{search}</div>
          <div className="w-48">{propertySelect()}</div>
          <div className="w-48">{categorySelect()}</div>
          <div className="w-44">{vendorSelect()}</div>
          <div className="w-40">{statusSelect()}</div>
          <div className="w-40">{rangeSelect()}</div>
          {customDates("expenses-d")}
          {pendingChip}
          {voidedToggle}
          {table.isFiltered && (
            <Button variant="ghost" onClick={table.clearFilters}>
              Clear all
            </Button>
          )}
          <div className="flex-1" />
          {view === "cards" && <SortSelect compact id="expenses-sort-desktop" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />}
          <ViewToggle value={view} onChange={setView} />
        </Toolbar>
      )}
      {isMobile && <div>{pendingChip}</div>}

      <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start">
        <div id={table.listId} className="min-w-0 flex-1 scroll-mt-24">
          <ExpensesTable
            view={view}
            isMobile={isMobile}
            rows={rows}
            state={state}
            sort={table.sort}
            onSortChange={table.setSort}
            empty={empty}
            error={error}
            footer={pagination}
            totals={list.data?.totals}
            updating={list.isPlaceholderData}
            categoryLabel={categoryLabel}
            onOpen={(e) => setOpen(e.id)}
          />
        </div>
        {/* Fixed 320px beside the list from 1536px (under it below that, so the table fits); the list (flex-1, min-w-0) can't push into it. */}
        <div className="min-w-0 2xl:w-80 2xl:shrink-0">
          <CategoryBreakdown
            summary={s}
            pending={summary.isPending}
            error={summary.isError ? summary.error : null}
            onRetry={() => void summary.refetch()}
            periodLabel={capitalize(period)}
            categoryLabel={categoryLabel}
          />
        </div>
      </div>

      {openId && <ExpenseDrawer key={openId} id={openId} placeholder={placeholder} onClose={() => setOpen(null)} />}
      {adding && <ExpenseFormModal onClose={() => setAdding(false)} />}
    </>
  );
}
