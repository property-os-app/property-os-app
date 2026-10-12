import * as React from "react";
import { cn } from "@/lib/cn";

export interface CollectionProgressProps {
  /** 0 to 100 */
  value: number;
  label?: string;
  className?: string;
}

/** Full-width 16px hazard-stripe bar with the collection rate at the right end. */
export function CollectionProgress({ value, label = "Collection rate", className }: CollectionProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-4 flex-1 overflow-hidden rounded-pill bg-surface-2">
        <div className="h-full rounded-pill hazard-fill animate-hazard transition-[width] duration-draw ease-out" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-h2 tabular text-text-primary">{pct.toFixed(1)}%</span>
    </div>
  );
}

/** Thin 8px bar for occupancy and similar ratios. */
export function Bar({ value, tone = "success", className }: { value: number; tone?: "success" | "warning" | "danger"; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-pill bg-surface-3", className)}>
      <div className={cn("h-full rounded-pill", tone === "success" && "bg-success", tone === "warning" && "bg-warning", tone === "danger" && "bg-danger")} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 0 to 100 ring, used for the portfolio health score. */
export function Ring({ value, size = 96, stroke = 8, className, children }: { value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--success)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-h1 tabular font-extrabold">{children ?? Math.round(pct)}</div>
    </div>
  );
}
