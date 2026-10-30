import { useMemo } from "react";
import { Link } from "react-router";
import { Ban, Eye, Pencil, Play, Trash2 } from "lucide-react";
import { Avatar, Caption, Dash, Num, Tag } from "@/components/atoms";
import { KebabMenu, ListCard, StatusBadge, type MenuItem } from "@/components/molecules";
import { CardList, DataTable, type Column, type DataTableProps } from "@/components/organisms";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { signatureStatusLabels } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { BalanceText } from "@/features/ledger/LedgerParts";
import type { LeasePageState } from "@/features/leases/LeasePage";
import { LeaseBadge } from "@/features/leases/LeaseParts";
import { coTenants, dueState, isPastEnd, primaryTenant } from "@/features/leases/stats";
import type { Lease } from "@/types/lease";

type Props = Pick<DataTableProps<Lease>, "rows" | "state" | "sort" | "onSortChange" | "empty" | "error" | "footer"> & {
  onOpen: (lease: Lease) => void;
  /** Desktop Cards view: the phone cards in a grid. Phones always get cards. */
  cards?: boolean;
  /** Omit the next four to hide those items (role can't edit leases). */
  onEdit?: (lease: Lease) => void;
  onActivate?: (lease: Lease) => void;
  onEnd?: (lease: Lease) => void;
  onDelete?: (lease: Lease) => void;
};

/** Expires date: red past the end date, amber when ending soon. */
function ExpiresText({ lease }: { lease: Lease }) {
  if (!lease.endDate) return <Dash />;
  return <span className={cn(isPastEnd(lease) ? "font-semibold text-danger" : lease.endingSoon && "font-semibold text-warning")}>{formatDate(lease.endDate)}</span>;
}

/** Tenant name with "+n" co-tenants, or null without a tenant. */
function tenantTitle(l: Lease): string | null {
  const primary = primaryTenant(l);
  if (!primary) return null;
  const others = coTenants(l).length;
  return others > 0 ? `${primary.fullName} +${others}` : primary.fullName;
}

const fromLeases: LeasePageState = { from: "leases" };

/**
 * The Leases list: a table from md up (or cards in a grid with `cards`), cards on phones (same rows, states and pagination).
 * Row / card opens the lease page; the kebab has Open, Edit, Activate, End lease, Delete draft.
 */
export function LeasesTable({ cards, onOpen, onEdit, onActivate, onEnd, onDelete, ...props }: Props) {
  const isMobile = useIsMobile();
  const menu = useMemo(
    () => (l: Lease) => {
      const items: MenuItem[] = [{ label: "Open", icon: <Eye strokeWidth={1.5} />, onSelect: () => onOpen(l) }];
      if (onEdit) items.push({ label: "Edit", icon: <Pencil strokeWidth={1.5} />, onSelect: () => onEdit(l) });
      if (onActivate && l.status === "DRAFT") items.push({ label: "Activate", icon: <Play strokeWidth={1.5} />, onSelect: () => onActivate(l) });
      if (onEnd && l.status === "ACTIVE") items.push({ label: "End lease", icon: <Ban strokeWidth={1.5} />, onSelect: () => onEnd(l) });
      if (onDelete && l.status === "DRAFT") {
        items.push({ label: "Delete draft", icon: <Trash2 strokeWidth={1.5} />, destructive: true, onSelect: () => onDelete(l) });
      }
      return <KebabMenu label={`Actions for lease ${l.leaseNumber}`} items={items} />;
    },
    [onOpen, onEdit, onActivate, onEnd, onDelete],
  );

  const columns = useMemo<Column<Lease>[]>(
    () => [
      {
        key: "tenant",
        header: "Tenant",
        sortable: true,
        cell: (l) => {
          const primary = primaryTenant(l);
          if (!primary) return <Dash />;
          const others = coTenants(l).length;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={primary.fullName} size={24} />
              <span className="truncate font-semibold">{primary.fullName}</span>
              {others > 0 && <Caption>+{others}</Caption>}
            </span>
          );
        },
      },
      {
        key: "unit",
        header: "Unit",
        cell: (l) => (
          <div className="min-w-0">
            <div>Unit {l.unit.unitNumber}</div>
            <Caption className="block truncate">{l.unit.property.name}</Caption>
          </div>
        ),
      },
      { key: "rent", header: "Rent", align: "right", sortable: true, cell: (l) => (l.rent === null ? <Dash /> : <Num>{formatCurrency(l.rent)}</Num>) },
      {
        key: "status",
        header: "Status",
        // "Overdue" next to the lease status, as on the phone cards: the label that goes with the red strip. The e-signature
        // status sits under them (its own column made the table wider than 1280).
        cell: (l) => (
          <span className="flex flex-col items-start gap-1 py-2">
            <span className="flex items-center gap-1.5">
              <LeaseBadge lease={l} />
              {dueState(l).kind === "overdue" && <StatusBadge domain="rent" status="OVERDUE" />}
            </span>
            <StatusBadge domain="esign" status={l.signatureStatus}>
              {`E-sign: ${signatureStatusLabels[l.signatureStatus].toLowerCase()}`}
            </StatusBadge>
          </span>
        ),
      },
      {
        key: "tags",
        header: "Tags",
        // Only from 1440px; the lease page shows them too.
        wideOnly: true,
        cell: (l) =>
          l.tags.length === 0 ? (
            <Dash />
          ) : (
            <span className="flex items-center gap-1.5">
              <Tag>{l.tags[0]}</Tag>
              {l.tags.length > 1 && <Caption>+{l.tags.length - 1}</Caption>}
            </span>
          ),
      },
      {
        key: "expires",
        header: "Expires",
        sortable: true,
        cell: (l) => (
          <div>
            <ExpiresText lease={l} />
            {l.termMonths !== null && <Caption className="block">{l.termMonths} months</Caption>}
          </div>
        ),
      },
      { key: "balance", header: "Balance", align: "right", sortable: true, cell: (l) => <BalanceText value={l.balance} /> },
      {
        key: "actions",
        header: <span className="sr-only">Actions</span>,
        width: 56,
        cell: menu,
      },
    ],
    [menu],
  );

  if (isMobile || cards) {
    return (
      <CardList
        grid={!isMobile}
        rows={props.rows}
        state={props.state}
        empty={props.empty}
        error={props.error}
        footer={props.footer}
        rowKey={(l) => l.id}
        caption="Leases"
        renderCard={(l) => {
          const name = tenantTitle(l);
          // The strip means one thing only: behind on rent (balance owed past its due date, from the list data).
          const overdue = dueState(l).kind === "overdue";
          return (
            <ListCard
              href={`/leases/${encodeURIComponent(l.id)}`}
              openLabel={`Open lease ${l.leaseNumber}${name ? `, ${name}` : ""}`}
              renderLink={(href, p) => <Link to={href} state={fromLeases} {...p} />}
              leading={<Avatar name={primaryTenant(l)?.fullName ?? "-"} size={32} />}
              title={name ?? <span className="text-text-muted">No tenant yet</span>}
              subtitle={`Unit ${l.unit.unitNumber} · ${l.unit.property.name}`}
              badge={
                <>
                  <LeaseBadge lease={l} />
                  {overdue && <StatusBadge domain="rent" status="OVERDUE" />}
                </>
              }
              amount={{ label: "Balance", value: <BalanceText value={l.balance} /> }}
              strip={overdue}
              facts={[
                { label: "Rent", value: l.rent === null ? <Dash /> : <Num>{formatCurrency(l.rent)}</Num> },
                { label: "Expires", value: <ExpiresText lease={l} /> },
                { label: "E-sign", value: <StatusBadge domain="esign" status={l.signatureStatus} /> },
              ]}
              actions={menu(l)}
            />
          );
        }}
      />
    );
  }

  // Same strip as the cards: behind on rent only.
  return <DataTable {...props} columns={columns} rowKey={(l) => l.id} onRowClick={onOpen} rowStrip={(l) => dueState(l).kind === "overdue"} caption="Leases" />;
}
