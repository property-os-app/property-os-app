import * as React from "react";
import { cn } from "@/lib/cn";

/** Shimmer block in the shape of the content it replaces. Never use spinners for page loads. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-badge bg-surface-2", className)} {...props}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-[rgba(0,0,0,0.04)] to-transparent dark:via-[rgba(255,255,255,0.06)]" />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-border-subtle", className)} />;
}
