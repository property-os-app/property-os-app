import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { buttonVariants, Caption, CollectionProgress, Skeleton } from "@/components/atoms";
import { Card, CardHeader, HeroStatCard, InlineError } from "@/components/molecules";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatMonth } from "@/lib/format";
import { plural } from "@/lib/labels";
import type { Section } from "@/features/dashboard/hooks";
import type { RentCollection } from "@/features/dashboard/stats";

export interface RentCollectionCardProps {
  month: string;
  rent: Section<RentCollection>;
}

/** The design's rent collection hero: Total due, Collected, Outstanding, then the collection bar. */
export function RentCollectionCard({ month, rent }: RentCollectionCardProps) {
  const r = rent.data;
  const monthLabel = formatMonth(month);

  return (
    <Card as="section" aria-label="Rent collection">
      <CardHeader
        description="Rent collection"
        title={`${monthLabel} collection period`}
        action={
          <Link to="/rent-roll" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-underline")}>
            Open Rent Roll
            <ChevronRight size={16} strokeWidth={1.5} />
          </Link>
        }
      />
      {rent.error ? (
        <InlineError title="Couldn't load rent collection" description={errorText(rent.error)} onRetry={rent.retry} />
      ) : !r ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[134px]" />
            ))}
          </div>
          <Skeleton className="mt-5 h-8" />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <HeroStatCard label="Total due" value={formatCurrency(r.totalRentDue)} note={`${plural(r.billedCount, "lease")} billed`} />
            <HeroStatCard
              label="Collected"
              tone="success"
              value={formatCurrency(r.collected)}
              note={
                <>
                  {r.paidCount} paid in full
                  {r.collectedNote && <span className="block">{r.collectedNote}</span>}
                </>
              }
            />
            <HeroStatCard label="Outstanding" tone="danger" value={formatCurrency(r.outstandingBalance)} note={`${r.overdueCount} overdue`} />
          </div>
          <CollectionProgress value={r.rate} className="mt-5" />
          {/* Rent is billed automatically before each due date (Settings → Billing), so there is nothing to press here. */}
          {r.rate === null && <Caption className="mt-3 block">Nothing billed for {monthLabel} yet. Rent bills automatically before each due date.</Caption>}
        </>
      )}
    </Card>
  );
}
