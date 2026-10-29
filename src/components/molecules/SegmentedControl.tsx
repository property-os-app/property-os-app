import * as React from "react";
import { Count } from "@/components/atoms/Badge";
import { cn } from "@/lib/cn";

export interface Segment<V extends string> {
  value: V;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  segments: Segment<V>[];
  "aria-label": string;
  className?: string;
}

/** Status filtering (Paid, Partial, Late...) and view switching. Shows a count per segment. Scrolls sideways inside itself when too wide. */
export function SegmentedControl<V extends string>({ value, onChange, segments, className, ...props }: SegmentedControlProps<V>) {
  return (
    <div role="group" aria-label={props["aria-label"]} className={cn("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-control border border-border-subtle bg-surface-2 p-1", className)}>
      {segments.map((s) => {
        const on = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(s.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-badge px-3 text-small font-semibold transition-colors duration-fast focus-visible:focus-ring",
              on ? "bg-surface-3 text-text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {s.icon}
            {s.label}
            {s.count !== undefined && <Count>{s.count}</Count>}
          </button>
        );
      })}
    </div>
  );
}

export interface TabItem<V extends string> {
  value: V;
  label: React.ReactNode;
  count?: number;
  countTone?: "neutral" | "danger";
}

export interface TabsProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  tabs: TabItem<V>[];
  className?: string;
}

/** Underline tabs for drawers, property pages and settings. Scrolls sideways inside itself when too wide (the base line is an inset shadow, so scrolling never clips the active underline). */
export function Tabs<V extends string>({ value, onChange, tabs, className }: TabsProps<V>) {
  return (
    <div
      role="tablist"
      className={cn("flex max-w-full gap-6 overflow-x-auto [scrollbar-width:none] shadow-[inset_0_-1px_0_var(--color-border-subtle)]", className)}
    >
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 py-3 text-body font-semibold whitespace-nowrap transition-colors duration-fast focus-visible:focus-ring focus-visible:outline-offset-[-2px]",
              on ? "border-success text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
            {t.count !== undefined && <Count tone={t.countTone}>{t.count}</Count>}
          </button>
        );
      })}
    </div>
  );
}

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  countTone?: "neutral" | "danger";
  onRemove?: () => void;
}

/** Filter chip; active filters are removable. */
export function FilterChip({ active, count, countTone, onRemove, className, children, ...props }: FilterChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border bg-surface-2 py-1 pl-2.5 pr-2.5 text-small",
        active ? "border-success text-text-primary" : "border-border-strong text-text-secondary",
        className,
      )}
    >
      <button type="button" className="inline-flex items-center gap-1.5 focus-visible:focus-ring" {...props}>
        {children}
        {count !== undefined && <Count tone={countTone}>{count}</Count>}
      </button>
      {active && onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove filter" className="rounded-full p-0.5 hover:bg-surface-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </span>
  );
}
