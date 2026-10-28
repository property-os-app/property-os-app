import { useState } from "react";
import { useNavigate } from "react-router";
import { Truck } from "lucide-react";
import { Button, Caption, Dash, H3 } from "@/components/atoms";
import { Card, EmptyState, KeyValueList, ListCard, Tabs } from "@/components/molecules";
import { CardList, DataTable, Drawer, Pagination, type Column } from "@/components/organisms";
import { ApiError, errorText } from "@/lib/api";
import { formatDate, formatTimestampDate } from "@/lib/format";
import { plural } from "@/lib/labels";
import { useIsMobile } from "@/lib/useIsMobile";
import { useAuth } from "@/features/auth/authContext";
import { ExpenseAmount, ExpenseStatusBadges } from "@/features/expenses/ExpenseParts";
import { propertyLine } from "@/features/expenses/expenseText";
import { useExpenses } from "@/features/expenses/hooks";
import { ContactLink } from "@/features/shared/ContactLink";
import { useTradeLabel, useVendor } from "@/features/vendors/hooks";
import { InactiveBadge, InsuranceBadge, type VendorActions } from "@/features/vendors/VendorParts";
import { rateText, tradeLine } from "@/features/vendors/vendorText";
import type { Expense } from "@/types/expense";
import type { Vendor } from "@/types/vendor";

type Tab = "overview" | "expenses";

const orDash = (value: string | null | undefined) => (value ? value : <Dash />);
const PAGE_SIZE = 10;

export interface VendorDrawerProps {
  /** The list row (shown until GET /vendors/:id answers). */
  vendor: Vendor;
  actions?: VendorActions;
  onClose: () => void;
}

/**
 * One vendor (lg drawer): Overview (contact, trade, rate, license, notes; Insurance card) and Expenses (GET /expenses?vendorId=,
 * newest first, 10 per page; a row opens it on the Expenses page). Footer with vendors.manage: Delete (unused only),
 * Archive / Unarchive, Edit vendor. Mount it only while open.
 */
export function VendorDrawer({ vendor: row, actions, onClose }: VendorDrawerProps) {
  const detail = useVendor(row.id, row);
  const tradeLabel = useTradeLabel();
  const [tab, setTab] = useState<Tab>("overview");
  const notFound = detail.error instanceof ApiError && detail.error.status === 404;
  const vendor = detail.data ?? row;
  const canAct = actions && !notFound;

  return (
    <Drawer
      open
      onOpenChange={(open) => !open && onClose()}
      size="lg"
      title={vendor.name}
      description={tradeLine(tradeLabel(vendor.trade), vendor)}
      status={notFound ? undefined : vendor.archivedAt ? <InactiveBadge vendor={vendor} /> : <InsuranceBadge vendor={vendor} />}
      tabs={
        notFound ? undefined : (
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Overview" },
              { value: "expenses", label: "Expenses", count: vendor.expenseCount },
            ]}
          />
        )
      }
      footer={
        canAct ? (
          <>
            {vendor.expenseCount === 0 && (
              <Button variant="ghost" onClick={() => actions.onDelete(vendor)}>
                Delete
              </Button>
            )}
            {vendor.archivedAt ? (
              <Button onClick={() => actions.onUnarchive(vendor)}>Unarchive</Button>
            ) : (
              <Button onClick={() => actions.onArchive(vendor)}>Archive</Button>
            )}
            <Button variant="primary" onClick={() => actions.onEdit(vendor)}>
              Edit vendor
            </Button>
          </>
        ) : undefined
      }
    >
      {notFound ? (
        <Card padding="none">
          <EmptyState icon={<Truck strokeWidth={1.5} />} title="Vendor not found" description="This vendor was deleted or doesn't exist." />
        </Card>
      ) : tab === "overview" ? (
        <Overview vendor={vendor} tradeLabel={tradeLabel(vendor.trade)} />
      ) : (
        <ExpensesTab vendor={vendor} />
      )}
    </Drawer>
  );
}

function Overview({ vendor, tradeLabel }: { vendor: Vendor; tradeLabel: string }) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <H3>Details</H3>
        <KeyValueList
          labelWidth={160}
          items={[
            { label: "Contact name", value: orDash(vendor.contactName) },
            { label: "Phone", value: <ContactLink kind="phone" value={vendor.phone} /> },
            { label: "Email", value: <ContactLink kind="email" value={vendor.email} wrap /> },
            { label: "Trade", value: tradeLabel },
            { label: "Service area", value: orDash(vendor.serviceArea) },
            { label: "Rate", value: rateText(vendor) ?? <Dash /> },
            { label: "License number", value: orDash(vendor.licenseNumber) },
            { label: "Notes", value: vendor.notes ? <span className="whitespace-pre-line">{vendor.notes}</span> : <Dash /> },
            { label: "Added", value: `${formatTimestampDate(vendor.createdAt)} by ${vendor.createdBy.name}` },
          ]}
        />
      </div>
      <Card padding="compact" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <H3>Insurance</H3>
          <InsuranceBadge vendor={vendor} />
        </div>
        <KeyValueList
          labelWidth={160}
          items={[
            { label: "Provider", value: orDash(vendor.insuranceProvider) },
            { label: "Policy number", value: orDash(vendor.insurancePolicyNumber) },
            { label: "Expires on", value: vendor.insuranceExpiresOn ? formatDate(vendor.insuranceExpiresOn) : <Dash /> },
          ]}
        />
      </Card>
    </>
  );
}

/** That vendor's expenses (all time, voided included), 10 per page. A manager only sees those on assigned properties. */
function ExpensesTab({ vendor }: { vendor: Vendor }) {
  const { me } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const list = useExpenses({ page, pageSize: PAGE_SIZE, vendorId: vendor.id, includeVoided: true });
  const isManager = me?.role === "PROPERTY_MANAGER";

  // The Expenses page opens the drawer for ?expense= (a drawer never opens on top of another).
  const open = (e: Expense) => void navigate(`/expenses?vendor=${encodeURIComponent(vendor.id)}&expense=${encodeURIComponent(e.id)}`);

  const state = list.isPending ? "loading" : list.isError ? "error" : list.data.items.length === 0 ? "empty" : "ideal";
  const rows = list.data?.items ?? [];
  const empty = { title: "No expenses yet", description: isManager ? "No expense on your properties uses this vendor." : "No expense uses this vendor." };
  const error = { title: "Couldn't load the expenses", description: list.isError ? errorText(list.error) : undefined, onRetry: () => void list.refetch() };
  const totalPages = list.data?.totalPages ?? 0;
  const footer =
    totalPages > 1 ? (
      <Pagination
        page={page}
        pageCount={totalPages}
        onPageChange={setPage}
        summary={`${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, list.data!.totalItems)} of ${list.data!.totalItems}`}
      />
    ) : undefined;

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", cell: (e) => <span className="whitespace-nowrap">{formatDate(e.date)}</span> },
    {
      key: "description",
      header: "Description",
      cell: (e) => (
        <div className="min-w-0">
          <div className="truncate font-semibold">{e.description}</div>
          <Caption className="block truncate">{propertyLine(e)}</Caption>
        </div>
      ),
    },
    { key: "amount", header: "Amount", align: "right", cell: (e) => <ExpenseAmount expense={e} /> },
    { key: "status", header: "Status", cell: (e) => <ExpenseStatusBadges expense={e} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      {list.data && list.data.totalItems > 0 && (
        <Caption>
          {plural(list.data.totalItems, "expense")}
          {isManager ? " on your properties" : ""}, newest first. Voided ones are included.
        </Caption>
      )}
      {isMobile ? (
        <CardList
          rows={rows}
          rowKey={(e) => e.id}
          caption="Expenses"
          state={state}
          empty={empty}
          error={error}
          footer={footer}
          renderCard={(e) => (
            <ListCard
              onOpen={() => open(e)}
              openLabel={`Open ${e.expenseNumber}`}
              title={e.description}
              subtitle={`${formatDate(e.date)} · ${propertyLine(e)}`}
              badge={<ExpenseStatusBadges expense={e} />}
              amount={{ label: "Amount", value: <ExpenseAmount expense={e} /> }}
              muted={e.voided}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(e) => e.id}
          onRowClick={open}
          density="compact"
          caption="Expenses"
          state={state}
          empty={empty}
          error={error}
          footer={footer}
        />
      )}
    </div>
  );
}
