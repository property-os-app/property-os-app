import * as React from "react";
import { cn } from "@/lib/cn";
import { Overline, Display, HeroStat, Small, Caption } from "@/components/atoms/Typography";
import { Delta } from "@/components/atoms/Badge";

/** Surface-1 card with 1px border, no shadow. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "compact" | "default";
  as?: "div" | "section" | "article";
}

export function Card({ padding = "default", as: Tag = "div", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-border-subtle bg-surface-1",
        padding === "default" && "p-6",
        padding === "compact" && "p-5",
        padding === "none" && "overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <div>
        {description && <Overline>{description}</Overline>}
        <div className="text-h3 text-text-primary">{title}</div>
      </div>
      {action}
    </div>
  );
}

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "danger" | "warning";
  delta?: { direction: "up" | "down" | "flat"; label: string };
  note?: React.ReactNode;
  /** Whole card is clickable and filters the list below. */
  href?: string;
  onClick?: () => void;
  /** Render the `href` link with your router (same signature as Sidebar's): (href, props) => <Link to={href} {...props} />. Default: plain <a>. */
  renderLink?: (href: string, props: { className: string; children: React.ReactNode }) => React.ReactNode;
  className?: string;
}

/**
 * Overline label, Display value, then the delta chip on its own line, then the note (each block inside it on its own line).
 * Inside a KpiRow the card is a 4-row subgrid, so labels, values, chips and notes start at the same height in every card
 * of a row (a card without a chip leaves that line empty). Elsewhere it is a plain stack.
 */
export function KpiCard({ label, value, tone = "default", delta, note, href, onClick, renderLink, className }: KpiCardProps) {
  const interactive = Boolean(href || onClick);
  const classes = cn(
    // Spacing is margin on the chip and note, not row gap, so an empty line takes no space.
    "row-span-4 grid min-w-0 grid-rows-subgrid content-start gap-y-0 rounded-card border border-border-subtle bg-surface-1 p-4 text-left no-underline text-text-primary md:p-5",
    interactive && "cursor-pointer transition-colors duration-fast hover:bg-surface-3 focus-visible:focus-ring",
    className,
  );
  const content = (
    <>
      <Overline>{label}</Overline>
      <Display className={cn("mt-2", tone === "success" && "text-success", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{value}</Display>
      <div className={cn(delta && "mt-2")}>{delta && <Delta direction={delta.direction}>{delta.label}</Delta>}</div>
      <div className={cn(note && "mt-2")}>{note && <Caption className="block">{note}</Caption>}</div>
    </>
  );
  if (href && renderLink) return renderLink(href, { className: classes, children: content });
  const Tag: React.ElementType = href ? "a" : onClick ? "button" : "div";
  return (
    <Tag href={href} onClick={onClick} type={onClick && !href ? "button" : undefined} className={classes}>
      {content}
    </Tag>
  );
}

export interface HeroStatCardProps {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "neutral" | "success" | "danger";
  className?: string;
}

/** Total Due, Collected, Outstanding. Color-coded top border. */
export function HeroStatCard({ label, value, note, tone = "neutral", className }: HeroStatCardProps) {
  return (
    <div
      className={cn(
        "@container flex min-w-0 flex-col gap-2 rounded-card border border-border-subtle border-t-[3px] bg-surface-1 p-6",
        tone === "neutral" && "border-t-border-strong",
        tone === "success" && "border-t-success",
        tone === "danger" && "border-t-danger",
        className,
      )}
    >
      <Overline>{label}</Overline>
      {/* Sized by the card's own width (container query): 24px in a narrow card, 32px, then 48px when "$42,500.00" fits. */}
      <HeroStat className={cn("text-h1 font-extrabold tracking-[-0.02em] @[14rem]:text-display @[18rem]:text-hero", tone === "success" && "text-success", tone === "danger" && "text-danger")}>{value}</HeroStat>
      {note && <Small>{note}</Small>}
    </div>
  );
}

/**
 * Titled card: title (H3), a short subtitle under it and an optional action at the top right (wraps under the title on
 * narrow widths), then the content. A `<section>` named by its title.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  padding = "default",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  padding?: CardProps["padding"];
  className?: string;
  children?: React.ReactNode;
}) {
  const titleId = React.useId();
  return (
    <Card as="section" padding={padding} aria-labelledby={titleId} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="m-0 text-h3 break-words text-text-primary">
            {title}
          </h3>
          {subtitle && <Small className="mt-0.5 block">{subtitle}</Small>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </Card>
  );
}

export interface IconTileProps {
  /** A 16px icon (shown in a small soft box), or an Avatar with `bareIcon`. */
  icon: React.ReactNode;
  /** No box around `icon` (an Avatar has its own circle). */
  bareIcon?: boolean;
  label: React.ReactNode;
  /** Bold. Long values wrap. Pass a "Not set" style text for a missing value, never a bare dash. */
  value: React.ReactNode;
  /** Classes on the value (`font-mono`, `text-danger`). */
  valueClassName?: string;
  /** Small text under the value. */
  note?: React.ReactNode;
  /** Next to the value (a Badge). */
  badge?: React.ReactNode;
  /** Right side: small buttons (Copy, Call, Remove); they stay clickable above `onOpen`. */
  action?: React.ReactNode;
  /** The whole tile opens something (a stretched button named `openLabel`). */
  onOpen?: () => void;
  openLabel?: string;
  className?: string;
}

/** Bordered tile: icon box, small label, bold value with an optional badge, optional note and action. Put several in an `IconTileGrid`. */
export function IconTile({ icon, bareIcon, label, value, valueClassName, note, badge, action, onOpen, openLabel, className }: IconTileProps) {
  return (
    <div
      className={cn(
        // The action drops to its own line (right-aligned) when the tile is too narrow for it and an 11rem value.
        "relative flex min-w-0 flex-wrap items-center gap-3 rounded-control border border-border-subtle bg-surface-1 p-3",
        onOpen && "transition-colors duration-fast hover:bg-surface-3",
        className,
      )}
    >
      {onOpen && (
        <button
          type="button"
          aria-label={openLabel}
          onClick={onOpen}
          className="absolute inset-0 cursor-pointer rounded-control focus-visible:focus-ring-tight focus-visible:[outline-offset:-2px]"
        />
      )}
      <div className={cn("relative flex min-w-[min(100%,11rem)] flex-1 items-center gap-3", onOpen && "pointer-events-none")}>
        {bareIcon ? (
          <span className="shrink-0">{icon}</span>
        ) : (
          <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-3 text-text-muted [&_svg]:size-4">
            {icon}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-caption text-text-secondary">{label}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("min-w-0 font-bold break-words text-text-primary [overflow-wrap:anywhere]", valueClassName)}>{value}</span>
            {badge}
          </div>
          {note && <Caption className="block break-words">{note}</Caption>}
        </div>
      </div>
      {action && <div className="pointer-events-auto relative ml-auto flex shrink-0 items-center gap-1">{action}</div>}
    </div>
  );
}

/** IconTiles: one per row on phones, two per row from sm (640px) up. */
export function IconTileGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

/** Amber-soft internal note, labeled "Internal, not visible to tenant". */
export function InternalNote({ author, date, children, className }: { author?: string; date?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-control border border-warning/30 bg-warning-soft p-3 text-text-primary", className)}>
      <Overline className="mb-1 text-warning">Internal, not visible to tenant</Overline>
      <div className="text-small">{children}</div>
      {(author || date) && <Caption className="mt-1.5 block">{[author, date].filter(Boolean).join(" · ")}</Caption>}
    </div>
  );
}

/** Two-column label / value list used in drawers and detail panels. */
export function KeyValueList({ items, className, labelWidth = 140 }: { items: { label: React.ReactNode; value: React.ReactNode }[]; className?: string; labelWidth?: number }) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-2 text-body", className)} style={{ gridTemplateColumns: `${labelWidth}px 1fr` }}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <dt className="text-text-secondary">{it.label}</dt>
          <dd className="m-0 text-text-primary">{it.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
