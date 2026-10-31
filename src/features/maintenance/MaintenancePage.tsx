import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { Button, Checkbox, Dash, Select, Skeleton } from "@/components/atoms";
import { FilterChip, FormField, KpiCard, SearchInput } from "@/components/molecules";
import { KpiRow, PageHeader, Pagination, Toolbar } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatCompactCurrency, formatCurrency, todayISO } from "@/lib/format";
import { priorityLabels, ticketStatusLabels, plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { serverPageSummary, useServerTable } from "@/lib/useServerTable";
import { useAuth } from "@/features/auth/authContext";
import { can } from "@/features/auth/permissions";
import { useTickets, useTicketSummary } from "@/features/maintenance/hooks";
import { useTicketActions } from "@/features/maintenance/TicketActions";
import { TicketBoard } from "@/features/maintenance/TicketBoard";
import { TicketDrawer } from "@/features/maintenance/TicketDrawer";
import { TicketFormModal } from "@/features/maintenance/TicketFormModal";
import { TicketsTable } from "@/features/maintenance/TicketsTable";
import {
  activeTicketFilterCount,
  boardColumnQuery,
  boardCounts,
  DEFAULT_TICKET_SORT,
  initialTicketFilters,
  PRIORITIES,
  TICKET_PAGE_SIZE,
  TICKET_SORT_KEYS,
  TICKET_STATUSES,
  tableQuery,
  ticketFilterValues,
  ticketSummaryQuery,
  UNASSIGNED,
  type BoardColumn,
  type TicketFilters,
} from "@/features/maintenance/ticketQuery";
import { emergencyNote, startOfWeek } from "@/features/maintenance/ticketText";
import { useProperties } from "@/features/properties/hooks";
import { useScope } from "@/features/scope/scopeContext";
import { FilterGroup, MobileFilters, SortSelect, type SortOption } from "@/features/shared/MobileFilters";
import { useBoardView } from "@/features/shared/listView";
import { BoardViewToggle } from "@/features/shared/ViewToggle";
import { useVendors } from "@/features/vendors/hooks";
import type { MaintenanceTicket } from "@/types/maintenance";

/** The drawer's query key: /maintenance?ticket=<id> opens it (also from expenses and the vendor drawer). */
const OPEN_KEY = "ticket";

const sortOptions: SortOption[] = [
  { key: "created", label: "Created", kind: "date" },
  { key: "priority", label: "Priority", kind: "text" },
];

/**
 * /maintenance: KPIs (GET /maintenance-tickets/summary for the sidebar scope, year to date), filters in the URL (search,
 * Property = sidebar scope, Priority, Assignee incl. "Unassigned", "Open past SLA"; Table view also Status and Include
 * cancelled), and the Board (one request per column) or the Table (server-side paging). Buttons come from each ticket's
 * allowedActions; "Add Ticket" needs maintenance.manage.
 */
export function MaintenancePage() {
  const { me } = useAuth();
  const user = me!;
  const canManage = can(user, "ticket.manage");
  const { propertyId: scope, setPropertyId } = useScope();
  const properties = useProperties();
  const vendors = useVendors();
  const isMobile = useIsMobile();
  const [view, setView] = useBoardView("maintenance", "board");
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);

  const table = useServerTable<TicketFilters>({
    initialFilters: initialTicketFilters,
    filterValues: ticketFilterValues(vendors.data?.map((v) => v.id)),
    sortKeys: TICKET_SORT_KEYS,
    initialSort: DEFAULT_TICKET_SORT,
  });
  const { filters } = table;
  const shared = { search: table.savedSearch, filters, scope };

  // Board: one request per column. Resolved = since Sunday (local).
  const weekStart = startOfWeek(todayISO()) ?? todayISO();
  const onBoard = view === "board";
  const columnQueries = {
    OPEN: useTickets(boardColumnQuery("OPEN", shared, weekStart), { enabled: onBoard }),
    ASSIGNED: useTickets(boardColumnQuery("ASSIGNED", shared, weekStart), { enabled: onBoard }),
    IN_PROGRESS: useTickets(boardColumnQuery("IN_PROGRESS", shared, weekStart), { enabled: onBoard }),
    RESOLVED: useTickets(boardColumnQuery("RESOLVED", shared, weekStart), { enabled: onBoard }),
  } satisfies Record<BoardColumn, unknown>;
  const counts = boardCounts(columnQueries.OPEN.data, columnQueries.RESOLVED.data);

  // Table
  const list = useTickets(tableQuery({ ...shared, sort: table.sort, page: table.page }), { enabled: !onBoard });
  const totalPages = list.data?.totalPages ?? 0;
  const { setPage } = table;
  useEffect(() => {
    if (!onBoard && totalPages > 0 && table.page > totalPages) setPage(totalPages);
  }, [onBoard, totalPages, table.page, setPage]);

  const summary = useTicketSummary(ticketSummaryQuery(scope));

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
  const actions = useTicketActions({ onOpen: (t: MaintenanceTicket) => setOpen(t.id) });

  const rows = list.data?.items ?? [];
  // The row or card the drawer opened from, shown until the detail loads.
  const placeholder = [...rows, ...Object.values(columnQueries).flatMap((q) => q.data?.items ?? [])].find((t) => t.id === openId);
  const tableState: "loading" | "error" | "empty" | "ideal" =
    list.isError && !list.data ? "error" : list.isPending ? "loading" : rows.length === 0 ? "empty" : "ideal";
  const scopeName = scope ? properties.data?.find((p) => p.id === scope)?.name : undefined;

  const addButton = (variant: "primary" | "secondary") =>
    canManage ? (
      <Button variant={variant} icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAdding(true)}>
        Add Ticket
      </Button>
    ) : undefined;

  const empty = table.isFiltered
    ? {
        title: "No tickets match your filters",
        description: "Try another search or filter.",
        action: <Button onClick={table.clearFilters}>Clear filters</Button>,
      }
    : {
        title: "No tickets yet",
        description: scope ? "Nothing for this property. Choose All properties to see everything." : "Log repair and service requests to track them here.",
        action: addButton("secondary"),
      };
  const error = { title: "Couldn't load tickets", description: list.isError ? errorText(list.error) : undefined, onRetry: () => void list.refetch() };
  const pagination =
    list.data && totalPages > 1 ? (
      <Pagination
        page={table.page}
        pageCount={totalPages}
        onPageChange={table.setPage}
        summary={serverPageSummary(table.page, TICKET_PAGE_SIZE, list.data.totalItems)}
      />
    ) : undefined;

  // KPIs
  const s = summary.data;
  const kpi = (value: ReactNode) => (s ? value : summary.isError ? <Dash /> : <Skeleton className="h-10 w-24" />);
  const change = s?.open.change ?? 0;
  const pastSlaOn = filters.pastSla === "1";

  const showAll = (column: BoardColumn) => {
    table.setFilters({ status: column, cancelled: "0" });
    setView("table");
  };

  // Filters
  const search = (
    <SearchInput
      placeholder="Search tickets"
      aria-label="Search title, description, vendor, unit or #number"
      value={table.search}
      onChange={(e) => table.setSearch(e.target.value)}
    />
  );
  const propertySelect = (id?: string) => (
    <Select
      id={id}
      aria-label={id ? undefined : "Property"}
      value={scope ?? "all"}
      onChange={(e) => setPropertyId(e.target.value === "all" ? null : e.target.value)}
    >
      <option value="all">All properties</option>
      {properties.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
  const prioritySelect = (id?: string) => (
    <Select
      id={id}
      aria-label={id ? undefined : "Priority"}
      value={filters.priority}
      onChange={(e) => table.setFilter("priority", e.target.value as TicketFilters["priority"])}
    >
      <option value="all">All priorities</option>
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {priorityLabels[p]}
        </option>
      ))}
    </Select>
  );
  const assigneeSelect = (id?: string) => (
    <Select id={id} aria-label={id ? undefined : "Assignee"} value={filters.assignee} onChange={(e) => table.setFilter("assignee", e.target.value)}>
      <option value="all">Any assignee</option>
      <option value={UNASSIGNED}>Unassigned</option>
      {vendors.data?.map((v) => (
        <option key={v.id} value={v.id}>
          {v.archivedAt ? `${v.name} (archived)` : v.name}
        </option>
      ))}
    </Select>
  );
  const statusSelect = (id?: string) => (
    <Select
      id={id}
      aria-label={id ? undefined : "Status"}
      value={filters.status}
      onChange={(e) => table.setFilter("status", e.target.value as TicketFilters["status"])}
    >
      <option value="all">All statuses</option>
      {TICKET_STATUSES.map((st) => (
        <option key={st} value={st}>
          {ticketStatusLabels[st]}
          {list.data ? ` (${list.data.statusCounts[st]})` : ""}
        </option>
      ))}
    </Select>
  );
  const pastSlaChip = (
    <FilterChip
      active={pastSlaOn}
      aria-pressed={pastSlaOn}
      count={s?.pastSlaCount}
      countTone={s && s.pastSlaCount > 0 ? "danger" : "neutral"}
      onClick={() => table.setFilter("pastSla", pastSlaOn ? "0" : "1")}
      onRemove={() => table.setFilter("pastSla", "0")}
      className={isMobile ? "min-h-11 px-4" : undefined}
    >
      Open past SLA
    </FilterChip>
  );
  const cancelledToggle = (
    <Checkbox
      label="Include cancelled"
      checked={filters.cancelled === "1"}
      disabled={filters.status !== "all"}
      onChange={(e) => table.setFilter("cancelled", e.target.checked ? "1" : "0")}
    />
  );

  return (
    <>
      <PageHeader
        title="Maintenance"
        description={`Work tickets across ${scopeName ?? "the portfolio"}. Emergencies first, then by age.`}
        actions={addButton("primary")}
      />

      <KpiRow>
        <KpiCard
          label="Open tickets"
          value={kpi(s?.open.count)}
          delta={s ? { direction: change > 0 ? "up" : change < 0 ? "down" : "flat", label: `${change > 0 ? "+" : ""}${change}` } : undefined}
          note={s ? "vs last week (approx.)" : undefined}
        />
        <KpiCard
          label="Emergency"
          tone={s && s.emergency.openCount > 0 ? "danger" : "default"}
          value={kpi(s?.emergency.openCount)}
          note={s ? emergencyNote(s.emergency) : undefined}
          onClick={s && s.emergency.openCount > 0 ? () => table.setFilters({ priority: "EMERGENCY" }) : undefined}
        />
        <KpiCard
          label="Average resolution"
          value={kpi(s ? s.resolution.averageDays === null ? <Dash /> : plural(s.resolution.averageDays, "day") : null)}
          note={s ? `${plural(s.resolution.resolvedCount, "ticket")} resolved this year` : undefined}
        />
        <KpiCard
          label="Cost YTD"
          value={kpi(s ? formatCurrency(s.cost.total) : null)}
          note={
            s ? (
              <>
                {formatCompactCurrency(s.cost.averageMonthly)} / mo avg
                {s.cost.pending.count > 0 && (
                  <span className="block">
                    + {formatCurrency(s.cost.pending.total)} pending approval ({s.cost.pending.count})
                  </span>
                )}
              </>
            ) : undefined
          }
        />
      </KpiRow>

      {isMobile ? (
        <>
          <Toolbar className="flex-nowrap">
            {search}
            <MobileFilters
              count={activeTicketFilterCount(filters, view)}
              resultCount={onBoard ? undefined : list.data?.totalItems}
              onClear={table.resetFilters}
            >
              <FormField label="Property (all pages)" htmlFor="tickets-property">
                {propertySelect("tickets-property")}
              </FormField>
              <FormField label="Priority" htmlFor="tickets-priority">
                {prioritySelect("tickets-priority")}
              </FormField>
              <FormField label="Assignee" htmlFor="tickets-assignee">
                {assigneeSelect("tickets-assignee")}
              </FormField>
              {!onBoard && (
                <>
                  <FormField label="Status" htmlFor="tickets-status">
                    {statusSelect("tickets-status")}
                  </FormField>
                  <FilterGroup label="Cancelled tickets">{cancelledToggle}</FilterGroup>
                  <SortSelect id="tickets-sort" sort={table.sort} onSortChange={table.setSort} options={sortOptions} />
                </>
              )}
            </MobileFilters>
          </Toolbar>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {pastSlaChip}
            <BoardViewToggle value={view} onChange={setView} />
          </div>
        </>
      ) : (
        <Toolbar>
          <div className="w-64">{search}</div>
          <div className="w-48">{propertySelect()}</div>
          <div className="w-40">{prioritySelect()}</div>
          <div className="w-44">{assigneeSelect()}</div>
          {pastSlaChip}
          {!onBoard && <div className="w-44">{statusSelect()}</div>}
          {!onBoard && cancelledToggle}
          {table.isFiltered && (
            <Button variant="ghost" onClick={table.clearFilters}>
              Clear all
            </Button>
          )}
          <div className="flex-1" />
          <BoardViewToggle value={view} onChange={setView} />
        </Toolbar>
      )}

      <div id={table.listId} className="min-w-0 scroll-mt-24">
        {onBoard ? (
          <TicketBoard columns={columnQueries} counts={counts} isMobile={isMobile} onAction={actions.run} onShowAll={showAll} />
        ) : (
          <TicketsTable
            isMobile={isMobile}
            rows={rows}
            state={tableState}
            sort={table.sort}
            onSortChange={table.setSort}
            empty={empty}
            error={error}
            footer={pagination}
            updating={list.isPlaceholderData}
            onAction={actions.run}
          />
        )}
      </div>

      {openId && <TicketDrawer key={openId} id={openId} placeholder={placeholder} onAction={actions.run} onClose={() => setOpen(null)} />}
      {adding && <TicketFormModal onSaved={(t) => setOpen(t.id)} onClose={() => setAdding(false)} />}
      {actions.dialogs}
    </>
  );
}
