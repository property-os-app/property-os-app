import { Bell, Wrench, ChevronRight } from "lucide-react";
import { RenterShell } from "@/components/templates/Shells";
import { Avatar } from "@/components/atoms/Avatar";
import { Badge } from "@/components/atoms/Badge";
import { Button, LinkButton } from "@/components/atoms/Button";
import { Display, Overline, Small, H2, Caption } from "@/components/atoms/Typography";
import { Card } from "@/components/molecules/Cards";
import { cn } from "@/lib/cn";

export interface RenterHomeProps {
  renter: { firstName: string; fullName: string };
  rent: { amount: string; dueDate: string; status: "paid" | "due" | "overdue"; note: string };
  unit: string;
  leaseEnd: string;
  openRequest?: { title: string; status: string; detail: string };
}

/**
 * Example page: Renter Home. Three taps or fewer to any core task.
 * Overdue rent is a clear red card with one action and no blaming language.
 */
export function RenterHomePage({ renter, rent, unit, leaseEnd, openRequest }: RenterHomeProps) {
  const overdue = rent.status === "overdue";
  return (
    <RenterShell
      active="home"
      header={
        <>
          <div>
            <Caption className="text-text-secondary">Thursday, Oct 8</Caption>
            <H2>Hi, {renter.firstName}</H2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" iconOnly aria-label="Notifications" icon={<Bell size={20} strokeWidth={1.5} />} />
            <a href="/renter/profile" aria-label="Profile"><Avatar name={renter.fullName} size={40} /></a>
          </div>
        </>
      }
    >
      <Card as="section" padding="compact" aria-label="Rent status" className={cn("flex flex-col gap-3", overdue ? "border-danger/50 bg-danger-soft" : rent.status === "paid" && "border-success/50")}>
        <div className="flex items-center justify-between"><Overline>Rent</Overline><Badge tone={overdue ? "danger" : rent.status === "paid" ? "success" : "warning"}>{overdue ? "Overdue" : rent.status === "paid" ? "Paid" : "Due"}</Badge></div>
        <div>
          <Display>{rent.amount}</Display>
          <Small>{rent.note}</Small>
        </div>
        {rent.status === "paid" ? (
          <div className="flex items-center justify-between"><Small>Next: {rent.amount} due {rent.dueDate}</Small><a href="/renter/payments" className="text-small font-semibold text-success">View payments</a></div>
        ) : (
          <>
            <LinkButton variant="primary" size="lg" block href="/renter/pay">Pay Now</LinkButton>
            {overdue && <a href="/renter/messages" className="text-center text-small text-text-secondary">Need more time? Message your manager</a>}
          </>
        )}
      </Card>

      {openRequest && (
        <a href="/renter/maintenance/1044" className="no-underline">
          <Card padding="compact" className="flex flex-col gap-3">
            <div className="flex items-center justify-between"><Overline>Maintenance</Overline><Badge tone="info">{openRequest.status}</Badge></div>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-info"><Wrench size={16} strokeWidth={1.5} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-primary">{openRequest.title}</div>
                <Small>{openRequest.detail}</Small>
              </div>
              <ChevronRight size={16} strokeWidth={1.5} className="text-text-muted" />
            </div>
          </Card>
        </a>
      )}

      <Card as="section" padding="compact" aria-label="Lease" className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><Overline>Lease</Overline><Badge tone="warning">Ends in 54 days</Badge></div>
        <div>
          <div className="font-semibold text-text-primary">{unit}</div>
          <Small>Ends {leaseEnd}</Small>
        </div>
        <LinkButton size="lg" href="/renter/lease">See Renewal Offer</LinkButton>
      </Card>
    </RenterShell>
  );
}
