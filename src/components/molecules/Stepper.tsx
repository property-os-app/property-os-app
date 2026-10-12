import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperProps {
  steps: string[];
  /** 0-based index of the current step. */
  current: number;
  className?: string;
}

/** Numbered horizontal stepper for onboarding and multi-step modals. */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("m-0 flex list-none items-center gap-2 p-0", className)}>
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <React.Fragment key={label}>
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={cn("flex items-center gap-2 text-small font-semibold", state === "done" && "text-text-secondary", state === "current" && "text-text-primary", state === "upcoming" && "text-text-muted")}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full border text-caption",
                  state === "done" && "border-success bg-success text-success-fg",
                  state === "current" && "border-success text-success",
                  state === "upcoming" && "border-border-strong",
                )}
              >
                {state === "done" ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </li>
            {i < steps.length - 1 && <li aria-hidden className="h-px min-w-4 flex-1 bg-border-strong" />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export interface StatusTrackerStep {
  label: string;
  detail?: string;
}

/** Vertical status tracker for the Renter Portal: Submitted, Assigned, In Progress, Resolved. */
export function StatusTracker({ steps, current, className }: { steps: StatusTrackerStep[]; current: number; className?: string }) {
  return (
    <ol className={cn("m-0 flex list-none flex-col p-0", className)}>
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={s.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  state === "done" && "border-success bg-success text-success-fg",
                  state === "current" && "border-success",
                  state === "upcoming" && "border-border-strong",
                )}
              >
                {state === "done" && <Check size={12} strokeWidth={3} />}
                {state === "current" && <span className="size-2 rounded-full bg-success" />}
              </span>
              {i < steps.length - 1 && <span className={cn("my-1 w-0.5 flex-1 min-h-4", i < current ? "bg-success" : "bg-border-strong")} />}
            </div>
            <div className="pb-4">
              <div className={cn("font-semibold", state === "upcoming" ? "text-text-muted" : "text-text-primary")}>{s.label}</div>
              {s.detail && <div className="text-small text-text-secondary">{s.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
