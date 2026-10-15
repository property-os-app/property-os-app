import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Caption, Num, Overline, Skeleton } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { linkFocus } from "@/features/shared/linkClass";

/** One breadcrumb link: `to` is a router path (may include a query, e.g. "/rent-roll?month=2026-10"). */
export interface Crumb {
  label: ReactNode;
  to: string;
}

/** "Parent / Parent / Current" above a detail page. Links use the router; the last part is plain text. */
export function Breadcrumb({ links, current }: { links: Crumb[]; current: ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-small">
      {links.map((l, i) => (
        <span key={i} className="flex shrink-0 items-center gap-1.5">
          <Link to={l.to} className={cn("text-text-secondary no-underline hover:text-text-primary", linkFocus)}>
            {l.label}
          </Link>
          <ChevronRight aria-hidden size={14} strokeWidth={1.5} className="shrink-0 text-text-muted" />
        </span>
      ))}
      <span className="truncate text-text-primary">{current}</span>
    </nav>
  );
}

/** Small KPI tile inside a detail page's header card: Overline label, big tabular value, Caption note. */
export function Tile({ label, value, note, loading, className }: { label: string; value: ReactNode; note: ReactNode; loading: boolean; className?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-border-subtle p-4">
      <Overline>{label}</Overline>
      {loading ? <Skeleton className="h-7 w-20" /> : <Num className={cn("text-h2 font-bold text-text-primary", className)}>{value}</Num>}
      <Caption>{loading ? " " : note}</Caption>
    </div>
  );
}
