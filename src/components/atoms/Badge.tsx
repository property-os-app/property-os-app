import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/** Semantic tone. Color is never used alone: every badge carries a label plus a leading dot or icon. */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "ai";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        neutral: "bg-surface-3 text-text-secondary",
        ai: "bg-ai-soft text-ai",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Replace the leading dot with an icon. AI badges show no dot. */
  icon?: React.ReactNode;
  dot?: boolean;
}

export function Badge({ className, tone, icon, dot, children, ...props }: BadgeProps) {
  const showDot = dot ?? (tone !== "ai" && !icon);
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon}
      {showDot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Outline pill for labels such as "Outstanding Balance". */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
}

export function Tag({ className, children, onRemove, ...props }: TagProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-pill border border-border-strong px-2 py-0.5 text-caption text-text-secondary", className)}
      {...props}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="-mr-1 rounded-full p-0.5 hover:bg-surface-3 hover:text-text-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </span>
  );
}

/** Small count bubble used in nav items, segments and tabs. */
export function Count({ className, tone = "neutral", children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "danger" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill px-1.5 text-overline font-semibold",
        tone === "neutral" && "bg-surface-3 text-text-secondary",
        tone === "danger" && "bg-danger text-white",
        tone === "success" && "bg-success text-success-fg",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Delta chip for KPI cards: up (green), down (red) or flat (neutral). */
export function Delta({ direction = "flat", className, children }: { direction?: "up" | "down" | "flat"; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-badge px-2 py-0.5 text-caption font-semibold",
        direction === "up" && "bg-success-soft text-success",
        direction === "down" && "bg-danger-soft text-danger",
        direction === "flat" && "bg-surface-3 text-text-secondary",
        className,
      )}
    >
      {direction === "up" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 17 17 7M7 7h10v10" /></svg>}
      {direction === "down" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 7l10 10M17 7v10H7" /></svg>}
      {children}
    </span>
  );
}
