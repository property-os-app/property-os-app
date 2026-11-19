import * as React from "react";
import { Columns3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Input";

export interface ColumnsMenuOption {
  key: string;
  label: string;
}

export interface ColumnsMenuProps {
  /** The optional columns, in table order. Columns that are always shown are not listed. */
  options: ColumnsMenuOption[];
  /** Keys of the options that are shown now. */
  visible: readonly string[];
  onToggle: (key: string, shown: boolean) => void;
  /** "Reset to default" at the bottom when given. */
  onReset?: () => void;
  label?: string;
  className?: string;
}

/**
 * "Columns" button that opens a panel of checkboxes to show or hide a table's optional columns.
 * A disclosure (not role="menu"): Tab moves through the checkboxes; Escape or a click outside closes it,
 * Escape returns focus to the button. 44px button and rows under md.
 */
export function ColumnsMenu({ options, visible, onToggle, onReset, label = "Columns", className }: ColumnsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const shown = new Set(visible);
  const count = options.filter((o) => shown.has(o.key)).length;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <Button
        ref={buttonRef}
        icon={<Columns3 size={16} strokeWidth={1.5} />}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="max-md:h-11"
      >
        {label}
        {count > 0 && <span className="text-text-secondary">({count})</span>}
      </Button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`Show or hide ${label.toLowerCase()}`}
          className="absolute right-0 z-30 mt-1 flex min-w-[220px] flex-col rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay"
        >
          {options.map((o) => (
            <Checkbox
              key={o.key}
              label={o.label}
              checked={shown.has(o.key)}
              onChange={(e) => onToggle(o.key, e.target.checked)}
              className="rounded-badge px-2.5 py-2 hover:bg-surface-3 max-md:min-h-11"
            />
          ))}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-1 rounded-badge border-t border-border-subtle px-2.5 py-2 text-left text-small text-text-secondary hover:bg-surface-3 hover:text-text-primary focus-visible:focus-ring max-md:min-h-11"
            >
              Reset to default
            </button>
          )}
        </div>
      )}
    </div>
  );
}
