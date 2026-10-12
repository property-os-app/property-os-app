import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  help?: React.ReactNode;
  /** Shown below the field in danger with an icon; also sets aria-describedby on the child when it is a single element. */
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** Optional element on the right of the label row, e.g. "Forgot password?". */
  action?: React.ReactNode;
}

/** Label above, control, helper or error text below. Validate on blur. */
export function FormField({ label, htmlFor, required, help, error, className, children, action }: FormFieldProps) {
  const id = React.useId();
  const describedBy = error ? `${id}-err` : help ? `${id}-help` : undefined;
  const child = React.isValidElement(children) && describedBy
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { "aria-describedby": describedBy, invalid: Boolean(error) })
    : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-small text-text-secondary">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        {action}
      </div>
      {child}
      {error ? (
        <div id={`${id}-err`} role="alert" className="flex items-center gap-1.5 text-small text-danger">
          <AlertTriangle size={16} strokeWidth={1.5} />
          {error}
        </div>
      ) : help ? (
        <div id={`${id}-help`} className="text-small text-text-muted">{help}</div>
      ) : null}
    </div>
  );
}
