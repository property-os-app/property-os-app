import * as React from "react";
import { Calendar, Plus, Download, Send } from "lucide-react";
import { WorkspaceShell } from "@/components/templates/Shells";
import { PageHeader, KpiRow, Toolbar } from "@/components/organisms/Topbar";
import { KpiCard, Card, KeyValueList } from "@/components/molecules/Cards";
import { Button } from "@/components/atoms/Button";
import { Avatar } from "@/components/atoms/Avatar";
import { Tag } from "@/components/atoms/Badge";
import { Dash, Num } from "@/components/atoms/Typography";
import { Input, Select, CurrencyInput, Checkbox } from "@/components/atoms/Input";
import { SearchInput } from "@/components/molecules/SearchInput";
import { SegmentedControl, Tabs } from "@/components/molecules/SegmentedControl";
import { StatusBadge, type RentStatus } from "@/components/molecules/StatusBadge";
import { FormField } from "@/components/molecules/FormField";
import { KebabMenu } from "@/components/molecules/Menu";
import { DataTable, Pagination, type Column } from "@/components/organisms/DataTable";
import { Drawer, Modal } from "@/components/organisms/Overlays";
import { toast } from "@/components/molecules/Feedback";
import { formatCurrency } from "@/lib/format";

interface RentRow {
  id: string;
  tenant: string;
  unit: string;
  property: string;
  due: number;
  paid: number;
  status: RentStatus;
  statusDate: string;
  leaseEnd: string;
}

const sample: RentRow[] = [
  { id: "1", tenant: "Aisha Rahman", unit: "12A", property: "Oakridge Commons", due: 1725, paid: 0, status: "Overdue", statusDate: "9 days overdue", leaseEnd: "Mar 31, 2027" },
  { id: "2", tenant: "Devon Price", unit: "5E", property: "Riverside Lofts", due: 2250, paid: 0, status: "Overdue", statusDate: "14 days overdue", leaseEnd: "Jun 30, 2027" },
  { id: "3", tenant: "Mei Chen", unit: "7D", property: "Maple Court", due: 1390, paid: 0, status: "Late", statusDate: "3 days late", leaseEnd: "Month-to-month" },
  { id: "4", tenant: "Luis Herrera", unit: "2C", property: "Riverside Lofts", due: 2100, paid: 1000, status: "Partial", statusDate: "Oct 4, 2026", leaseEnd: "Nov 15, 2026" },
  { id: "5", tenant: "Jordan Blake", unit: "4B", property: "Maple Court", due: 1450, paid: 1450, status: "Paid", statusDate: "Oct 1, 2026", leaseEnd: "Nov 30, 2026" },
  { id: "6", tenant: "Hannah Weiss", unit: "9F", property: "Oakridge Commons", due: 1680, paid: 1680, status: "Paid", statusDate: "Oct 2, 2026", leaseEnd: "Oct 31, 2026" },
  { id: "7", tenant: "", unit: "6C", property: "Maple Court", due: 1450, paid: 0, status: "Vacant", statusDate: "Since Sep 1, 2026", leaseEnd: "" },
];

type Filter = "all" | RentStatus;

/** Example page: Rent Roll with segmented status filter, bulk reminder, ledger drawer and Record Payment modal. */
export function RentRollPage() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<RentRow | null>(null);
  const [tab, setTab] = React.useState<"ledger" | "lease" | "documents" | "notes">("ledger");
  const [payment, setPayment] = React.useState<RentRow | null>(null);
  const [amount, setAmount] = React.useState<number | "">("");
  const [page, setPage] = React.useState(1);

  const rows = filter === "all" ? sample : sample.filter((r) => r.status === filter);
  const counts: Record<Filter, number> = { all: 80, Paid: 69, Partial: 2, Late: 2, Overdue: 2, Vacant: 4 };

  const columns: Column<RentRow>[] = [
    { key: "tenant", header: "Tenant", cell: (r) => r.status === "Vacant" ? <span className="flex items-center gap-3"><Avatar name="-" size={24} /><Dash /></span> : <span className="flex items-center gap-3"><Avatar name={r.tenant} size={24} />{r.tenant}</span> },
    { key: "unit", header: "Unit", cell: (r) => r.unit },
    { key: "property", header: "Property", cell: (r) => <span className="text-text-secondary">{r.property}</span> },
    { key: "due", header: "Rent due", align: "right", sortable: true, cell: (r) => formatCurrency(r.due) },
    { key: "paid", header: "Paid", align: "right", cell: (r) => r.status === "Vacant" ? <Dash /> : formatCurrency(r.paid) },
    { key: "balance", header: "Balance", align: "right", sortable: true, cell: (r) => r.status === "Vacant" ? <Dash /> : <Num className={r.due - r.paid > 0 ? "font-semibold text-danger" : ""}>{formatCurrency(r.due - r.paid)}</Num> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge domain="rent" status={r.status} /> },
    { key: "date", header: "Status date", cell: (r) => <span className="text-text-secondary">{r.statusDate}</span> },
    { key: "actions", header: "", width: 48, align: "right", cell: (r) => <KebabMenu items={[{ label: "Record payment", onSelect: () => setPayment(r) }, { label: "Send reminder", onSelect: () => toast.success(`Reminder sent to ${r.tenant}`) }]} /> },
  ];

  return (
    <WorkspaceShell
      sidebar={{ role: "admin", active: "rentroll", scope: "All properties", user: { name: "Dana Whitfield", roleLabel: "Company Admin" } }}
      topbar={{ title: "Rent Roll", scope: "All properties", user: { name: "Dana Whitfield" } }}
    >
      <PageHeader
        title="Rent Roll"
        description="Unit-by-unit payment ledger for the October 2026 collection period."
        actions={<><Button icon={<Calendar size={16} strokeWidth={1.5} />}>October 2026</Button><Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setPayment(sample[3]!)}>Record Payment</Button></>}
      />
      <KpiRow>
        <KpiCard label="Total collected" value="$121.1K" tone="success" delta={{ direction: "up", label: "87.5%" }} note="of $138.4K due" />
        <KpiCard label="Outstanding balance" value="$17.3K" tone="danger" delta={{ direction: "down", label: "4 tenants" }} note="2 overdue more than 7 days" />
        <KpiCard label="On-time rate" value="91.2%" delta={{ direction: "up", label: "2.1%" }} note="vs. September" />
        <KpiCard label="Vacancy loss" value="$5.9K" delta={{ direction: "flat", label: "4 vacant" }} note="Market rent, this period" />
      </KpiRow>
      <Toolbar>
        <SegmentedControl
          aria-label="Filter by status"
          value={filter}
          onChange={setFilter}
          segments={(["all", "Paid", "Partial", "Late", "Overdue", "Vacant"] as Filter[]).map((f) => ({ value: f, label: f === "all" ? "All" : f, count: counts[f] }))}
        />
        <SearchInput placeholder="Search tenant or unit" />
        <span className="flex-1" />
        <Button size="sm" icon={<Download size={16} strokeWidth={1.5} />}>Export CSV</Button>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setOpen(r); setTab("ledger"); }}
        selected={selected}
        onSelectedChange={setSelected}
        bulkActions={(sel) => <Button size="sm" icon={<Send size={16} strokeWidth={1.5} />} onClick={() => toast.success(`Reminder sent to ${sel.size} tenants`)}>Send Reminder to {sel.size} tenants</Button>}
        totals={["Totals", "76 billed", "", formatCurrency(138400), formatCurrency(121060), formatCurrency(17340), "", "", ""]}
        footer={<Pagination page={page} pageCount={8} onPageChange={setPage} summary="Showing 1 to 10 of 80 units" />}
        caption="Rent roll, October 2026"
      />

      <Drawer
        open={Boolean(open)}
        onOpenChange={(o) => !o && setOpen(null)}
        size="lg"
        title={open?.tenant || "Vacant unit"}
        description={open ? `Unit ${open.unit}, ${open.property} · Lease to ${open.leaseEnd || "-"}` : undefined}
        status={open && <StatusBadge domain="rent" status={open.status} />}
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ value: "ledger", label: "Ledger" }, { value: "lease", label: "Lease" }, { value: "documents", label: "Documents", count: 3 }, { value: "notes", label: "Notes" }]} />}
        footer={<><Button>Send Reminder</Button><Button variant="primary" onClick={() => open && setPayment(open)}>Record Payment</Button></>}
      >
        {open && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card padding="compact"><div className="text-overline uppercase text-text-secondary">Current balance</div><div className={`mt-1 text-h2 tabular ${open.due - open.paid > 0 ? "text-danger" : "text-success"}`}>{formatCurrency(open.due - open.paid)}</div></Card>
              <Card padding="compact"><div className="text-overline uppercase text-text-secondary">Monthly rent</div><div className="mt-1 text-h2 tabular">{formatCurrency(open.due)}</div></Card>
              <Card padding="compact"><div className="text-overline uppercase text-text-secondary">On-time payments</div><div className="mt-1 text-h2 tabular">9 of 12</div></Card>
            </div>
            <KeyValueList items={[{ label: "Autopay", value: "Off" }, { label: "Last reminder", value: "Oct 5, 2026" }, { label: "Tags", value: <span className="flex gap-2"><Tag>Outstanding Balance</Tag></span> }]} />
          </>
        )}
      </Drawer>

      <Modal
        open={Boolean(payment)}
        onOpenChange={(o) => !o && setPayment(null)}
        title="Record Payment"
        footer={<><Button onClick={() => setPayment(null)}>Cancel</Button><Button variant="primary" onClick={() => { toast.success(`Payment of ${formatCurrency(Number(amount) || 0)} recorded for Unit ${payment?.unit}`); setPayment(null); }}>Record Payment</Button></>}
      >
        <FormField label="Tenant" required help={payment ? `Balance due: ${formatCurrency(payment.due - payment.paid)} of ${formatCurrency(payment.due)}` : undefined}>
          <Select defaultValue={payment?.id}>{sample.filter((r) => r.tenant).map((r) => <option key={r.id} value={r.id}>{r.tenant}, Unit {r.unit}, {r.property}</option>)}</Select>
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount" required><CurrencyInput value={amount} onChange={setAmount} /></FormField>
          <FormField label="Payment date" required><Input type="date" defaultValue="2026-10-08" /></FormField>
        </div>
        <FormField label="Method" required><Select defaultValue="ach"><option value="ach">ACH bank transfer</option><option value="card">Card</option><option value="check">Check</option></Select></FormField>
        <FormField label="Reference"><Input placeholder="Check number or confirmation ID" /></FormField>
        <Checkbox defaultChecked label="This is a partial payment. Keep the remaining balance open." />
      </Modal>
    </WorkspaceShell>
  );
}
