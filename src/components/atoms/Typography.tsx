import * as React from "react";
import { cn } from "@/lib/cn";

type TextProps<T extends React.ElementType> = { as?: T; className?: string; children?: React.ReactNode } & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

function make<D extends React.ElementType>(defaultTag: D, classes: string, displayName: string) {
  function Text<T extends React.ElementType = D>({ as, className, ...props }: TextProps<T>) {
    const Tag = (as ?? defaultTag) as React.ElementType;
    return <Tag className={cn(classes, className)} {...props} />;
  }
  Text.displayName = displayName;
  return Text;
}

/** 48/56 · 800 · Rent Collection hero numbers */
export const HeroStat = make("div", "text-hero tabular text-text-primary", "HeroStat");
/** 32/40 · 800 · KPI values, portal greetings */
export const Display = make("div", "text-display tabular text-text-primary", "Display");
/** 24/32 · 700 · Page title */
export const H1 = make("h1", "text-h1 m-0 text-text-primary", "H1");
/** 20/28 · 700 · Section and drawer title */
export const H2 = make("h2", "text-h2 m-0 text-text-primary", "H2");
/** 16/24 · 600 · Card title */
export const H3 = make("h3", "text-h3 m-0 text-text-primary", "H3");
/** 14/20 · 500 · Default text */
export const Body = make("p", "text-body m-0 text-text-primary", "Body");
/** 13/18 · 500 · Secondary and helper text */
export const Small = make("span", "text-small text-text-secondary", "Small");
/** 12/16 · 500 · Timestamps, badges */
export const Caption = make("span", "text-caption text-text-muted", "Caption");
/** 11/16 · 600 · uppercase · KPI labels, table headers, nav groups */
export const Overline = make("div", "text-overline uppercase text-text-secondary", "Overline");

/** Monetary or numeric value with tabular figures. */
export function Num({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("tabular", className)} {...props} />;
}

/** Empty value placeholder: a single muted dash, never "N/A". */
export function Dash({ className }: { className?: string }) {
  return <span className={cn("text-text-muted", className)}>-</span>;
}
