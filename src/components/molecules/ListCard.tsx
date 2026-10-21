import * as React from "react";
import { cn } from "@/lib/cn";
import { Caption, Overline, Small } from "@/components/atoms/Typography";
import { Skeleton } from "@/components/atoms/Skeleton";

export interface ListCardFact {
  label: string;
  value: React.ReactNode;
}

export interface ListCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Avatar or icon left of the title. */
  leading?: React.ReactNode;
  /** Status badge(s), on their own row under the subtitle. */
  badge?: React.ReactNode;
  /** 2-3 label / value pairs. */
  facts?: ListCardFact[];
  /** Right-aligned amount next to the title, with an optional label above and caption under it. */
  amount?: { label?: string; value: React.ReactNode; caption?: React.ReactNode };
  /** Extra line at the bottom (e.g. a void reason). */
  note?: React.ReactNode;
  /** Red left edge. In this app it means one thing only: behind on rent. */
  strip?: boolean;
  /** Muted text (voided entries). */
  muted?: boolean;
  /** Kebab menu. It sits above the tap area, so it never opens the card. */
  actions?: React.ReactNode;
  /** The whole card opens `href` (a link) or calls `onOpen` (a button). Without either the card isn't interactive. */
  href?: string;
  onOpen?: () => void;
  /** Accessible name of the card's link or button, e.g. "Open lease LSE-2026-001". Required with href / onOpen. */
  openLabel?: string;
  /** Render the `href` link with your router (like KpiCard): (href, props) => <Link to={href} {...props} />. Default: plain <a>. */
  renderLink?: (href: string, props: { className: string; "aria-label": string | undefined }) => React.ReactNode;
  /** No border or radius, for a divided list inside a card or drawer. */
  flat?: boolean;
  className?: string;
}

/**
 * One list row as a card (phones). The tap area is one link or button stretched over the card;
 * the content above it ignores the pointer, except the kebab. No z-index on purpose: an open kebab menu must stay
 * above the next card (positioned elements paint in DOM order, so the kebab is already above the tap area).
 */
export function ListCard({
  title, subtitle, leading, badge, facts, amount, note, strip, muted, actions, href, onOpen, openLabel, renderLink, flat, className,
}: ListCardProps) {
  const interactive = Boolean(href || onOpen);
  const overlay = cn("absolute inset-0", flat ? "focus-visible:focus-ring-tight focus-visible:[outline-offset:-2px]" : "rounded-card focus-visible:focus-ring");
  let open: React.ReactNode = null;
  if (href) open = renderLink ? renderLink(href, { className: overlay, "aria-label": openLabel }) : <a href={href} aria-label={openLabel} className={overlay} />;
  else if (onOpen) open = <button type="button" aria-label={openLabel} onClick={onOpen} className={cn(overlay, "cursor-pointer")} />;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 bg-surface-1 p-4 text-text-primary",
        !flat && "rounded-card border border-border-subtle",
        interactive && (flat ? "transition-colors duration-fast hover:bg-surface-3" : "transition-colors duration-fast hover:border-border-strong"),
        className,
      )}
    >
      {strip && <span aria-hidden className={cn("absolute left-0 w-1 bg-danger", flat ? "inset-y-0" : "-inset-y-px -left-px rounded-l-card")} />}
      {open}
      <div className={cn("pointer-events-none relative flex items-start gap-3", muted && "text-text-muted")}>
        {leading && <span className="shrink-0">{leading}</span>}
        <div className="min-w-0 flex-1">
          <div className={cn("truncate font-semibold", muted ? "text-text-muted" : "text-text-primary")}>{title}</div>
          {subtitle && <Small className="block truncate">{subtitle}</Small>}
          {badge && <div className="mt-2 flex flex-wrap items-center gap-1.5">{badge}</div>}
        </div>
        {amount && (
          <div className="flex shrink-0 flex-col items-end text-right">
            {amount.label && <Overline>{amount.label}</Overline>}
            <span className="tabular font-semibold">{amount.value}</span>
            {amount.caption && <Caption className="whitespace-nowrap">{amount.caption}</Caption>}
          </div>
        )}
        {actions && <div className="pointer-events-auto relative -my-2 -mr-2 shrink-0">{actions}</div>}
      </div>
      {facts && facts.length > 0 && (
        <dl className={cn("pointer-events-none relative m-0 grid gap-3", facts.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-1">
              <dt><Overline>{f.label}</Overline></dt>
              <dd className={cn("m-0 truncate text-small", muted ? "text-text-muted" : "text-text-primary")}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {note && <Caption className="pointer-events-none relative block">{note}</Caption>}
    </article>
  );
}

/** Loading placeholder in the shape of a ListCard. */
export function ListCardSkeleton({ flat, facts = 3 }: { flat?: boolean; facts?: number }) {
  return (
    <div className={cn("flex flex-col gap-3 bg-surface-1 p-4", !flat && "rounded-card border border-border-subtle")}>
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-52 max-w-full" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      {facts > 0 && (
        <div className={cn("grid gap-3", facts >= 3 ? "grid-cols-3" : "grid-cols-2")}>
          {Array.from({ length: facts }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      )}
    </div>
  );
}
