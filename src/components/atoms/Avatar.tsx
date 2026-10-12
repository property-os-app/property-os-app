import * as React from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  src?: string;
  size?: 24 | 32 | 40 | 56;
  /** Green presence dot for online. */
  online?: boolean;
}

export function Avatar({ name, src, size = 32, online, className, ...props }: AvatarProps) {
  const text = size === 24 ? "text-[10px]" : size === 32 ? "text-caption" : size === 40 ? "text-body" : "text-h3";
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-3 font-semibold text-text-primary", text, className)}
      style={{ width: size, height: size }}
      title={name}
      {...props}
    >
      {src ? <img src={src} alt={name} className="size-full rounded-full object-cover" /> : initials(name)}
      {online && <span aria-label="Online" className="absolute -bottom-px -right-px size-2.5 rounded-full border-2 border-surface-1 bg-success" />}
    </span>
  );
}
