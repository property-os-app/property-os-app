import * as React from "react";
import { Sparkles, X, RefreshCw, AlertTriangle } from "lucide-react";
import { toast as sonnerToast, Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { H3, Small } from "@/components/atoms/Typography";

/* ---------- Empty state ---------- */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** 24px icon, H3 title, one sentence, one primary action. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center text-text-secondary", className)}>
      {icon && <span className="text-text-muted [&>svg]:size-6">{icon}</span>}
      <H3>{title}</H3>
      <Small>{description}</Small>
      {action}
    </div>
  );
}

/* ---------- Inline error ---------- */
export interface InlineErrorProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Plain message plus Retry. Never leave a blank area. */
export function InlineError({ title, description, onRetry, className }: InlineErrorProps) {
  return (
    <div role="alert" className={cn("flex items-center gap-3 rounded-card border border-danger/40 bg-surface-1 p-5", className)}>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle size={16} strokeWidth={1.5} />
      </span>
      <div className="flex-1">
        <div className="font-semibold text-text-primary">{title}</div>
        {description && <Small>{description}</Small>}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry} icon={<RefreshCw size={16} strokeWidth={1.5} />}>
          Retry
        </Button>
      )}
    </div>
  );
}

/* ---------- Banner (unsaved / offline) ---------- */
export function Banner({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center gap-3 border-b border-border-subtle bg-warning-soft px-8 py-2.5 font-semibold text-warning", className)}>
      <AlertTriangle size={16} strokeWidth={1.5} />
      <span className="flex-1 text-small">{children}</span>
      {action}
    </div>
  );
}

/* ---------- AI action item ---------- */
export interface AiActionItemProps {
  finding: string;
  reason: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
  className?: string;
}

/** Violet left border, one-line finding, one-line reason, one action, dismiss. */
export function AiActionItem({ finding, reason, actionLabel, onAction, onDismiss, className }: AiActionItemProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-r-control border-l-[3px] border-ai bg-surface-2 py-3 pl-3.5 pr-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-text-primary">{finding}</div>
        {onDismiss && (
          <Button variant="ghost" size="sm" iconOnly aria-label="Dismiss" onClick={onDismiss} icon={<X size={16} strokeWidth={1.5} />} />
        )}
      </div>
      <Small>{reason}</Small>
      <div>
        <Button size="sm" onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}

/** Card header row that marks a surface as AI: sparkle icon, title, AI badge. */
export function AiHeading({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Sparkles size={20} strokeWidth={1.5} className="text-ai" />
      <H3>{title}</H3>
      <Badge tone="ai">AI</Badge>
    </div>
  );
}

/* ---------- Timeline item ---------- */
export type TimelineTone = "success" | "danger" | "warning" | "info" | "ai" | "neutral";

export interface TimelineItemProps {
  icon: React.ReactNode;
  tone?: TimelineTone;
  children: React.ReactNode;
  meta: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

const toneBg: Record<TimelineTone, string> = {
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  ai: "bg-ai-soft text-ai",
  neutral: "bg-surface-3 text-text-secondary",
};

export function TimelineItem({ icon, tone = "neutral", children, meta, right, className }: TimelineItemProps) {
  return (
    <div className={cn("flex gap-3 border-b border-border-subtle py-2.5 last:border-b-0", className)}>
      <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full [&>svg]:size-4", toneBg[tone])}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-text-primary">{children}</div>
          {right}
        </div>
        <div className="text-caption text-text-muted">{meta}</div>
      </div>
    </div>
  );
}

export function TimelineDay({ children }: { children: React.ReactNode }) {
  return <div className="py-2 text-overline uppercase text-text-muted">{children}</div>;
}

/* ---------- Chat bubble ---------- */
export function ChatBubble({ mine, children, meta, className }: { mine?: boolean; children: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[72%] rounded-card px-3.5 py-2.5 text-body", mine ? "self-end rounded-br-sm bg-success-soft" : "self-start rounded-bl-sm bg-surface-2", className)}>
      {children}
      {meta && <div className={cn("mt-1 text-caption text-text-muted", mine && "text-right")}>{meta}</div>}
    </div>
  );
}

/* ---------- Toasts (Sonner) ---------- */
/** Mount once near the app root. Bottom right by default; pass `position` to move it (e.g. "top-center" so drawer and modal footers stay clear). */
export function Toaster({ position = "bottom-right" }: { position?: React.ComponentProps<typeof SonnerToaster>["position"] }) {
  return (
    <SonnerToaster
      position={position}
      duration={4000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flex w-[360px] items-center gap-3 rounded-card border border-border-subtle bg-overlay px-4 py-3 text-body text-text-primary shadow-overlay font-sans",
          title: "font-semibold text-small",
          description: "text-caption text-text-muted",
          actionButton: "ml-auto rounded-control px-3 h-8 text-small font-semibold text-text-secondary hover:bg-surface-3",
          error: "border-danger/40",
          success: "",
        },
      }}
    />
  );
}

/** Past tense and specific: toast.success("Payment of $1,450.00 recorded for Unit 4B"). Errors persist until dismissed. */
export const toast = {
  /** `duration` in ms (default: the Toaster's 4000), e.g. a longer window for Undo. */
  success: (message: string, opts?: { description?: string; undo?: () => void; duration?: number }) =>
    sonnerToast.success(message, {
      description: opts?.description,
      duration: opts?.duration,
      action: opts?.undo ? { label: "Undo", onClick: opts.undo } : undefined,
    }),
  error: (message: string, opts?: { description?: string; retry?: () => void }) =>
    sonnerToast.error(message, { description: opts?.description, duration: Infinity, action: opts?.retry ? { label: "Retry", onClick: opts.retry } : undefined }),
  info: (message: string, description?: string) => sonnerToast(message, { description }),
};
