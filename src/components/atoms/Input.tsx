import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const base =
  "h-10 w-full rounded-control border border-border-strong bg-surface-2 px-3 text-body text-text-primary placeholder:text-text-muted " +
  "outline-none transition-colors duration-fast focus:border-success focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Mobile-sized control (44px, 16px text) for the Renter Portal. */
  mobile?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, mobile, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, invalid && "border-danger", mobile && "h-11 text-body-lg", className)}
      {...props}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, "h-auto min-h-24 resize-y py-2.5", invalid && "border-danger", className)}
      {...props}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/** Native select styled like Input, with a chevron. Swap for Radix Select when you need search. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} aria-invalid={invalid || undefined} className={cn(base, "appearance-none pr-9", invalid && "border-danger", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden size={16} strokeWidth={1.5} className="pointer-events-none absolute right-3 top-3 text-text-muted" />
    </div>
  );
});

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | "";
  onChange: (value: number | "") => void;
  symbol?: string;
  invalid?: boolean;
}

/** Currency symbol prefix, right-aligned tabular digits, formats on blur. */
export function CurrencyInput({ value, onChange, symbol = "$", invalid, className, onBlur, onFocus, ...props }: CurrencyInputProps) {
  const [text, setText] = React.useState(value === "" ? "" : value.toFixed(2));
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => {
    if (!editing) setText(value === "" ? "" : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }, [value, editing]);
  return (
    <div className={cn(base, "flex items-center gap-2 px-3", invalid && "border-danger", className)}>
      <span className="text-text-secondary">{symbol}</span>
      <input
        inputMode="decimal"
        className="w-full bg-transparent text-right tabular outline-none"
        value={text}
        onFocus={(e) => { setEditing(true); setText(value === "" ? "" : String(value)); onFocus?.(e); }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          setText(raw);
          onChange(raw === "" ? "" : Number(raw));
        }}
        onBlur={(e) => { setEditing(false); onBlur?.(e); }}
        {...props}
      />
    </div>
  );
}

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("inline-flex cursor-pointer items-center gap-2.5 text-body text-text-primary", className)}>
      <span className="relative inline-flex size-[18px] items-center justify-center">
        <input id={inputId} type="checkbox" className="peer absolute inset-0 size-full cursor-pointer opacity-0" {...props} />
        <span className="pointer-events-none size-full rounded border border-border-strong bg-surface-2 peer-checked:border-success peer-checked:bg-success peer-focus-visible:focus-ring" />
        <svg aria-hidden className="pointer-events-none absolute hidden size-3 text-success-fg peer-checked:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      {label}
    </label>
  );
}

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Switch, 40×22. Always give it an aria-label or wrap in a label. */
export function Toggle({ checked, onChange, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-pill border-0 transition-colors duration-fast focus-visible:focus-ring",
        checked ? "bg-success" : "bg-border-strong",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn("absolute top-0.5 size-[18px] rounded-full transition-[left] duration-fast", checked ? "left-5 bg-success-fg" : "left-0.5 bg-surface-1")}
      />
    </button>
  );
}

/** Keyboard hint, e.g. ⌘K. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("rounded border border-border-strong bg-surface-1 px-1.5 text-overline text-text-muted", className)}>{children}</span>;
}
