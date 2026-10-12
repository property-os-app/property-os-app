import * as React from "react";
import { Calendar, Plus, DollarSign, AlertTriangle, Truck, Check, Clock, Sparkles } from "lucide-react";
import { WorkspaceShell } from "@/components/templates/Shells";
import { PageHeader, KpiRow } from "@/components/organisms/Topbar";
import { KpiCard, Card, CardHeader } from "@/components/molecules/Cards";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { RentCollectionHero, AiActionPanel, AiCommandCenter, ActivityTimeline, type AiAction, type ActivityEvent } from "@/components/organisms/Panels";
import { IncomeExpenseChart } from "@/components/organisms/Charts";
import { SegmentedControl } from "@/components/molecules/SegmentedControl";
import { Modal } from "@/components/organisms/Overlays";
import { toast } from "@/components/molecules/Feedback";

/**
 * Example page: Dashboard, Company Admin.
 * Pages are the only layer that holds data and state; everything below is presentational.
 * Replace the sample data with your queries.
 */
export function DashboardPage() {
  const [range, setRange] = React.useState<"6m" | "12m">("6m");
  const [preview, setPreview] = React.useState<AiAction | null>(null);
  const [actions, setActions] = React.useState<AiAction[]>([
    { id: "renewals", finding: "4 leases expire within 60 days", reason: "Renewal notices sent 60 days out renew 31% more often in this portfolio.", actionLabel: "Send Renewals" },
    { id: "late", finding: "2 tenants overdue more than 7 days", reason: "Aisha Rahman (9 days) and Devon Price (14 days). $3,975.00 outstanding.", actionLabel: "Send Late Notices" },
    { id: "assign", finding: "2 tickets have no assignee", reason: "#1042 is an emergency open for 2 hours. Tom Alvarez is on shift.", actionLabel: "Assign All" },
  ]);

  const months = [
    { label: "May", income: 131.2, expenses: 44.1 }, { label: "Jun", income: 133.8, expenses: 52.3 }, { label: "Jul", income: 135.1, expenses: 41.8 },
    { label: "Aug", income: 136.9, expenses: 47.5 }, { label: "Sep", income: 137.6, expenses: 43.9 }, { label: "Oct", income: 121.1, expenses: 38.2 },
  ];

  const events: ActivityEvent[] = [
    { id: "1", day: "Today", icon: <DollarSign />, tone: "success", text: <>Payment of <strong className="tabular">$1,450.00</strong> received from Jordan Blake</>, meta: "Unit 4B, Maple Court · 2h ago" },
    { id: "2", day: "Today", icon: <AlertTriangle />, tone: "danger", text: "Emergency ticket #1042 opened by Mei Chen", meta: "Unit 7D, Maple Court · 2h ago" },
    { id: "3", day: "Today", icon: <Truck />, tone: "info", text: "Bright Spark Electric dispatched to #1039", meta: "Oakridge Commons · 4h ago" },
    { id: "4", day: "Yesterday", icon: <Check />, tone: "success", text: "Lease signed by Samuel Okafor", meta: "Unit 3A, Cedar Row Townhomes" },
    { id: "5", day: "Yesterday", icon: <Clock />, tone: "warning", text: "Late notice sent to Devon Price", meta: "Unit 5E, Riverside Lofts" },
    { id: "6", day: "Yesterday", icon: <Sparkles />, tone: "ai", text: "AI flagged Riverside Lofts expense anomaly", meta: "Portfolio" },
  ];

  const dismiss = (a: AiAction) => {
    setActions((xs) => xs.filter((x) => x.id !== a.id));
    toast.success(`Dismissed "${a.finding}"`, { undo: () => setActions((xs) => [a, ...xs]) });
  };

  return (
    <WorkspaceShell
      sidebar={{ role: "admin", active: "dashboard", scope: "All properties", user: { name: "Dana Whitfield", roleLabel: "Company Admin" }, badges: { inbox: { count: 7 }, chat: { count: 3 }, maintenance: { count: 1, tone: "danger" } } }}
      topbar={{ title: "Dashboard", scope: "All properties", user: { name: "Dana Whitfield" }, unreadNotifications: 5 }}
    >
      <PageHeader
        title="Good morning, Dana"
        description="Portfolio health for October 2026 across 4 properties and 80 units."
        actions={
          <>
            <Button icon={<Calendar size={16} strokeWidth={1.5} />}>October 2026</Button>
            <Button variant="primary" icon={<Plus size={16} strokeWidth={1.5} />}>Record Payment</Button>
          </>
        }
      />

      <RentCollectionHero period="October 2026" totalDue={138400} collected={121060} outstanding={17340} unitsBilled={76} paymentsReceived={71} lateCount={4} rentRollHref="/rent-roll" />

      <KpiRow>
        <KpiCard label="Occupancy rate" value="93.8%" delta={{ direction: "up", label: "1.2%" }} note="75 of 80 units" href="/units" />
        <KpiCard label="Leases expiring soon" value="4" tone="warning" delta={{ direction: "flat", label: "60 days" }} note="1 within 30 days" href="/leases" />
        <KpiCard label="Open maintenance tickets" value="6" note={<Badge tone="danger">1 emergency</Badge>} href="/maintenance" />
        <KpiCard label="Overdue and late tenants" value="4" tone="danger" delta={{ direction: "down", label: "2" }} note="vs. September" href="/rent-roll" />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card as="section">
            <CardHeader
              description="Income vs. expenses"
              title="Net cash flow, last 6 months"
              action={<SegmentedControl aria-label="Range" value={range} onChange={setRange} segments={[{ value: "6m", label: "6 months" }, { value: "12m", label: "12 months" }]} />}
            />
            <IncomeExpenseChart data={months} />
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <AiActionPanel actions={actions} onAction={setPreview} onDismiss={dismiss} onResolveAll={() => toast.info("Resolve All opens a summary confirmation listing every action")} />
          <AiCommandCenter score={82} headline="Healthy, trending up" explanation="Collection is on pace, but 2 vacant units at Oakridge Commons have been empty 41 days." insight="Riverside Lofts expenses are 18% above its 6-month average, driven by HVAC repairs." detailsHref="/reports" />
          <ActivityTimeline events={events} viewAllHref="/activity" limit={6} />
        </div>
      </div>

      {/* AI actions that message tenants always open a preview first. */}
      <Modal
        open={Boolean(preview)}
        onOpenChange={(o) => !o && setPreview(null)}
        title={preview?.actionLabel ?? ""}
        description="Review recipients and the message before sending."
        footer={
          <>
            <Button onClick={() => setPreview(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { toast.success(`${preview?.actionLabel} sent`); setPreview(null); }}>Confirm and Send</Button>
          </>
        }
      >
        <p className="m-0 text-body">{preview?.reason}</p>
      </Modal>
    </WorkspaceShell>
  );
}
