import { Caption, Dash } from "@/components/atoms";
import { ListCard } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { formatCurrency, formatTimestampDate } from "@/lib/format";
import type { OnTicketAction } from "@/features/maintenance/ticketMenu";
import { PriorityBadge, TicketMenu, TicketStatusBadges } from "@/features/maintenance/TicketParts";
import { ageText, locationLabel, slaText, ticketNo } from "@/features/maintenance/ticketText";
import type { MaintenanceTicket } from "@/types/maintenance";

type Props = Pick<DataTableProps<MaintenanceTicket>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  isMobile: boolean;
  /** True while the next page or filter loads (the old rows stay). */
  updating?: boolean;
  onAction: OnTicketAction;
};

/** Actual cost when there is one, else "est. $1,800.00", else Dash. */
function CostCell({ t }: { t: MaintenanceTicket }) {
  if (t.actualCost) return <span className="font-semibold tabular">{formatCurrency(t.actualCost)}</span>;
  if (t.estimatedCost) return <span className="tabular text-text-secondary">est. {formatCurrency(t.estimatedCost)}</span>;
  return <Dash />;
}

/** "2h ago" plus the SLA line (red once past SLA). */
function AgeCell({ t, now }: { t: MaintenanceTicket; now: Date }) {
  const sla = slaText(t, now);
  return (
    <div className="whitespace-nowrap">
      <div>{ageText(t.createdAt, now)}</div>
      {sla && <Caption className={cn("block", sla.tone === "danger" && "font-semibold text-danger")}>{sla.label}</Caption>}
    </div>
  );
}

/**
 * The Table view: DataTable (#, Title + location, Priority, Status, Assignee, Age / SLA, Cost, Created; Created sorts newest /
 * oldest and Priority sorts Emergency first, both on the server; kebab with the allowed actions). Phones: ListCards.
 * A row opens the drawer.
 */
export function TicketsTable({ isMobile, updating, onAction, ...props }: Props) {
  const now = new Date();
  // Rebuilt each render so the ages use this render's clock.
  const columns: Column<MaintenanceTicket>[] = [
    { key: "number", header: "#", cell: (t) => <span className="tabular text-text-secondary">{ticketNo(t)}</span> },
    {
      key: "title",
      header: "Title",
      cell: (t) => (
        <div className="min-w-0">
          <div className="max-w-72 truncate font-semibold" title={t.title}>
            {t.title}
          </div>
          <Caption className="block max-w-72 truncate">{locationLabel(t)}</Caption>
        </div>
      ),
    },
    { key: "priority", header: "Priority", sortable: true, cell: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", cell: (t) => <TicketStatusBadges ticket={t} /> },
    {
      key: "assignee",
      header: "Assignee",
      cell: (t) => (t.vendor ? <span className="block max-w-40 truncate">{t.vendor.name}</span> : <span className="text-text-secondary">Unassigned</span>),
    },
    { key: "age", header: "Age / SLA", cell: (t) => <AgeCell t={t} now={now} /> },
    { key: "cost", header: "Cost", align: "right", cell: (t) => <CostCell t={t} /> },
    { key: "created", header: "Created", sortable: true, cell: (t) => <span className="whitespace-nowrap">{formatTimestampDate(t.createdAt)}</span> },
    { key: "actions", header: <span className="sr-only">Actions</span>, cell: (t) => <TicketMenu ticket={t} onAction={onAction} /> },
  ];

  if (isMobile) {
    return (
      <CardList
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(t) => t.id}
        caption="Maintenance tickets"
        className={cn(updating && "opacity-70")}
        renderCard={(t) => {
          const sla = slaText(t, now);
          return (
            <ListCard
              onOpen={() => onAction("open", t)}
              openLabel={`Open ${ticketNo(t)} ${t.title}`}
              title={t.title}
              subtitle={`${ticketNo(t)} · ${locationLabel(t)}`}
              badge={
                <span className="inline-flex flex-wrap gap-1.5">
                  <PriorityBadge priority={t.priority} />
                  <TicketStatusBadges ticket={t} />
                </span>
              }
              amount={{ label: t.actualCost ? "Cost" : "Estimate", value: <CostCell t={t} /> }}
              facts={[
                { label: "Assignee", value: t.vendor?.name ?? "Unassigned" },
                { label: "Age", value: sla ? `${ageText(t.createdAt, now)} · ${sla.label}` : ageText(t.createdAt, now) },
              ]}
              muted={t.status === "CANCELLED"}
              actions={<TicketMenu ticket={t} onAction={onAction} />}
            />
          );
        }}
      />
    );
  }

  return (
    <div aria-busy={updating || undefined} className={cn("transition-opacity", updating && "opacity-70")}>
      <DataTable {...props} columns={columns} rowKey={(t) => t.id} onRowClick={(t) => onAction("open", t)} caption="Maintenance tickets" />
    </div>
  );
}
