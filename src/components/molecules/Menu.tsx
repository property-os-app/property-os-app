import * as React from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/atoms/Button";

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Lightweight kebab menu for row actions. Opens on click, closes on outside click or Escape.
 * Swap the trigger/panel for @radix-ui/react-dropdown-menu if you need typeahead or submenus.
 */
/** `trigger`: optional content for the opening button (e.g. an Avatar) instead of the "⋮" icon. */
export function KebabMenu({ items, label = "More actions", className, trigger }: { items: MenuItem[]; label?: string; className?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className={cn("relative inline-block", className)} onClick={(e) => e.stopPropagation()}>
      {trigger ? (
        <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded-full focus-visible:focus-ring">
          {trigger}
        </button>
      ) : (
        <Button variant="ghost" size="sm" iconOnly aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} icon={<MoreVertical size={16} strokeWidth={1.5} />} />
      )}
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 flex min-w-[200px] flex-col rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              type="button"
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect(); }}
              className={cn("flex items-center gap-2.5 rounded-badge px-2.5 py-2 text-left text-body hover:bg-surface-3 disabled:opacity-50 [&>svg]:size-4", it.destructive ? "text-danger" : "text-text-primary")}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
