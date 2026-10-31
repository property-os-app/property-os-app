import type { MouseEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button, Caption, Num, Overline, Skeleton } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { linkFocus } from "@/features/shared/linkClass";

/** The page a detail page goes back to: `to` is a router path (may include a query, e.g. "/rent-roll?month=2026-10"). */
export interface Crumb {
  label: string;
  to: string;
}

/** React Router keeps the history index in history.state; above 0 means there is an in-app page to go back to. */
const hasAppHistory = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;

/**
 * One line on top of a detail page: [←] Parent › Current. The arrow and the Parent crumb go to the same place:
 * back in history when `backInHistory` (opened from `parent` in this tab, so its URL keeps the month, filters and search)
 * and there is an in-app entry, else `parent.to`. The crumb is a real link (open in a new tab works).
 * Never wraps: the Parent crumb shortens with an ellipsis first; Current stays whole unless it alone is wider than the line.
 */
export function BackBreadcrumb({ parent, current, backInHistory }: { parent: Crumb; current: ReactNode; backInHistory: boolean }) {
  const navigate = useNavigate();
  const canGoBack = () => backInHistory && hasAppHistory();
  const goBack = () => void (canGoBack() ? navigate(-1) : navigate(parent.to));
  // A plain click on the crumb does what the arrow does; ctrl / cmd / middle click keep the link's default.
  const onCrumbClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !canGoBack()) return;
    e.preventDefault();
    void navigate(-1);
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        className="shrink-0 max-md:size-11"
        aria-label={`Back to ${parent.label}`}
        icon={<ArrowLeft size={16} strokeWidth={1.5} />}
        onClick={goBack}
      />
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="m-0 flex min-w-0 list-none items-center gap-1.5 p-0 text-small">
          <li className="flex min-w-0">
            <Link to={parent.to} onClick={onCrumbClick} className={cn("block truncate text-text-secondary no-underline hover:text-text-primary", linkFocus)}>
              {parent.label}
            </Link>
          </li>
          <li aria-hidden className="flex shrink-0">
            <ChevronRight size={14} strokeWidth={1.5} className="text-text-muted" />
          </li>
          <li aria-current="page" className="max-w-full shrink-0 truncate text-text-primary">
            {current}
          </li>
        </ol>
      </nav>
    </div>
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
