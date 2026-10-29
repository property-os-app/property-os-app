import { useState } from "react";
import { useNavigate } from "react-router";
import { Caption } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, Pagination, type Column } from "@/components/organisms";
import { errorText } from "@/lib/api";
import { formatTimestampDate } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { useTickets } from "@/features/maintenance/hooks";
import { PriorityBadge, TicketStatusBadges } from "@/features/maintenance/TicketParts";
import { locationLabel, ticketNo } from "@/features/maintenance/ticketText";
import { RatingStars } from "@/features/shared/Rating";
import type { MaintenanceTicket } from "@/types/maintenance";
import type { Vendor } from "@/types/vendor";

const PAGE_SIZE = 10;

/**
 * The vendor drawer's Tickets tab: GET /maintenance-tickets?vendorId= (cancelled ones too, newest first, 10 per page; a
 * manager sees only tickets on assigned properties). A row opens the ticket on the Maintenance page (drawers never stack).
 */
export function VendorTicketsTab({ vendor }: { vendor: Vendor }) {
  const { me } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const list = useTickets({ page, pageSize: PAGE_SIZE, vendorId: vendor.id, includeCancelled: true });
  const isManager = me?.role === "PROPERTY_MANAGER";

  const open = (t: MaintenanceTicket) => void navigate(`/maintenance?ticket=${encodeURIComponent(t.id)}`);

  const rows = list.data?.items ?? [];
  const state = list.isPending ? "loading" : list.isError && !list.data ? "error" : rows.length === 0 ? "empty" : "ideal";
  const empty = {
    title: "No tickets yet",
    description: isManager ? "No ticket on your properties is assigned to this vendor." : "No ticket is assigned to this vendor.",
  };
  const error = { title: "Couldn't load the tickets", description: list.isError ? errorText(list.error) : undefined, onRetry: () => void list.refetch() };
  const totalPages = list.data?.totalPages ?? 0;
  const footer =
    totalPages > 1 && list.data ? (
      <Pagination
        page={page}
        pageCount={totalPages}
        onPageChange={setPage}
        summary={`${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, list.data.totalItems)} of ${list.data.totalItems}`}
      />
    ) : undefined;

  const columns: Column<MaintenanceTicket>[] = [
    { key: "number", header: "#", cell: (t) => <span className="tabular text-text-secondary">{ticketNo(t)}</span> },
    {
      key: "title",
      header: "Ticket",
      cell: (t) => (
        <div className="min-w-0">
          <div className="max-w-64 truncate font-semibold" title={t.title}>
            {t.title}
          </div>
          <Caption className="block max-w-64 truncate">{locationLabel(t)}</Caption>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (t) => <TicketStatusBadges ticket={t} /> },
    { key: "rating", header: "Rating", cell: (t) => (t.vendorRating !== null ? <RatingStars value={t.vendorRating} /> : null) },
    { key: "created", header: "Created", cell: (t) => <span className="whitespace-nowrap">{formatTimestampDate(t.createdAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-3">
      {list.data && list.data.totalItems > 0 && (
        <Caption>
          {plural(list.data.totalItems, "ticket")}
          {isManager ? " on your properties" : ""}, newest first. Cancelled ones are included.
        </Caption>
      )}
      {isMobile ? (
        <CardList
          rows={rows}
          rowKey={(t) => t.id}
          caption="Tickets"
          state={state}
          empty={empty}
          error={error}
          footer={footer}
          renderCard={(t) => (
            <ListCard
              onOpen={() => open(t)}
              openLabel={`Open ${ticketNo(t)} ${t.title}`}
              title={t.title}
              subtitle={`${ticketNo(t)} · ${locationLabel(t)}`}
              badge={
                <span className="inline-flex flex-wrap gap-1.5">
                  <PriorityBadge priority={t.priority} />
                  <TicketStatusBadges ticket={t} />
                </span>
              }
              muted={t.status === "CANCELLED"}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          onRowClick={open}
          density="compact"
          caption="Tickets"
          state={state}
          empty={empty}
          error={error}
          footer={footer}
        />
      )}
    </div>
  );
}
