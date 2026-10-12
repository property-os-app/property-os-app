import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardHeader, HeroStatCard } from "@/components/molecules/Cards";
import { CollectionProgress, Ring } from "@/components/atoms/Progress";
import { Button, LinkButton } from "@/components/atoms/Button";
import { AiActionItem, AiHeading, TimelineItem, TimelineDay, type TimelineTone } from "@/components/molecules/Feedback";
import { Small } from "@/components/atoms/Typography";
import { formatCurrency } from "@/lib/format";

/* ---------- Rent collection hero ---------- */
export interface RentCollectionHeroProps {
  period: string;
  totalDue: number;
  collected: number;
  outstanding: number;
  unitsBilled: number;
  paymentsReceived: number;
  lateCount: number;
  rentRollHref?: string;
  className?: string;
}

export function RentCollectionHero({ period, totalDue, collected, outstanding, unitsBilled, paymentsReceived, lateCount, rentRollHref, className }: RentCollectionHeroProps) {
  const rate = totalDue > 0 ? (collected / totalDue) * 100 : 0;
  return (
    <Card as="section" aria-label="Rent collection" className={className}>
      <CardHeader
        description="Rent collection"
        title={`${period} collection period`}
        action={rentRollHref && <LinkButton variant="ghost" size="sm" href={rentRollHref}>Open Rent Roll<ChevronRight size={16} strokeWidth={1.5} /></LinkButton>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <HeroStatCard label="Total due" value={formatCurrency(totalDue)} note={`${unitsBilled} units billed`} />
        <HeroStatCard label="Collected" value={formatCurrency(collected)} tone="success" note={`${paymentsReceived} payments received`} />
        <HeroStatCard label="Outstanding" value={formatCurrency(outstanding)} tone="danger" note={`${lateCount} tenants late or overdue`} />
      </div>
      <CollectionProgress value={rate} className="mt-5" />
    </Card>
  );
}

/* ---------- AI action panel ---------- */
export interface AiAction {
  id: string;
  finding: string;
  reason: string;
  actionLabel: string;
}

export interface AiActionPanelProps {
  actions: AiAction[];
  /** Must open a preview and confirmation before anything is sent to a tenant. */
  onAction: (action: AiAction) => void;
  onDismiss: (action: AiAction) => void;
  /** Opens a summary confirmation listing every action that will run. */
  onResolveAll: () => void;
  className?: string;
}

export function AiActionPanel({ actions, onAction, onDismiss, onResolveAll, className }: AiActionPanelProps) {
  return (
    <Card as="section" padding="compact" aria-label="AI action panel" className={cn("border-ai/35", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <AiHeading title="Needs attention" />
        <Button variant="ai" size="sm" onClick={onResolveAll} disabled={!actions.length}>Resolve All</Button>
      </div>
      <div className="flex flex-col gap-2">
        {actions.length === 0 && <Small>Nothing needs attention right now.</Small>}
        {actions.map((a) => (
          <AiActionItem key={a.id} finding={a.finding} reason={a.reason} actionLabel={a.actionLabel} onAction={() => onAction(a)} onDismiss={() => onDismiss(a)} />
        ))}
      </div>
    </Card>
  );
}

/* ---------- AI command center ---------- */
export interface AiCommandCenterProps {
  score: number;
  headline: string;
  explanation: string;
  insight: string;
  detailsHref?: string;
  className?: string;
}

export function AiCommandCenter({ score, headline, explanation, insight, detailsHref, className }: AiCommandCenterProps) {
  return (
    <Card as="section" padding="compact" aria-label="AI command center" className={className}>
      <AiHeading title="Portfolio health" className="mb-3" />
      <div className="flex items-center gap-4">
        <Ring value={score} />
        <div className="flex flex-col gap-1">
          <div className="font-semibold">{headline}</div>
          <Small>{explanation}</Small>
          {detailsHref && <a href={detailsHref} className="text-small text-ai">See what affects this</a>}
        </div>
      </div>
      <div className="my-4 h-px bg-border-subtle" />
      <div className="mb-1.5 text-overline uppercase text-text-secondary">Today's insight</div>
      <div className="text-small">{insight}</div>
    </Card>
  );
}

/* ---------- Activity timeline ---------- */
export interface ActivityEvent {
  id: string;
  day: string;
  icon: React.ReactNode;
  tone: TimelineTone;
  text: React.ReactNode;
  meta: string;
}

export function ActivityTimeline({ events, viewAllHref, limit, className }: { events: ActivityEvent[]; viewAllHref?: string; limit?: number; className?: string }) {
  const shown = limit ? events.slice(0, limit) : events;
  let lastDay = "";
  return (
    <Card as="section" padding="compact" aria-label="Activity timeline" className={className}>
      <CardHeader title="Activity" className="mb-2" action={viewAllHref && <a href={viewAllHref} className="text-small text-text-secondary">View all</a>} />
      <div className="flex flex-col">
        {shown.map((e) => {
          const dayHeader = e.day !== lastDay ? <TimelineDay>{e.day}</TimelineDay> : null;
          lastDay = e.day;
          return (
            <React.Fragment key={e.id}>
              {dayHeader}
              <TimelineItem icon={e.icon} tone={e.tone} meta={e.meta}>{e.text}</TimelineItem>
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}
