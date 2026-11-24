import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { initialActive, isMoveKey, moveActive } from "@/lib/comboboxKeys";
import { matchesQuery } from "@/lib/textMatch";
import { Input } from "@/components/atoms/Input";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line, in secondary text. */
  description?: string;
  /** What the field shows once chosen. Default: `label`. */
  selectedLabel?: string;
  /** Extra text the search matches but doesn't show, e.g. a lease number. */
  keywords?: string;
}

export interface ComboboxProps {
  id?: string;
  name?: string;
  options: readonly ComboboxOption[];
  /** The chosen option's value; "" when none. */
  value: string;
  /** A pick, or "" from the clear button. */
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Names the list and the clear button, e.g. "Tenant". */
  listLabel: string;
  placeholder?: string;
  noMatchesText?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

/**
 * Searchable select (WAI-ARIA combobox with a listbox). Click, type or ↓ opens the list; typing narrows it (`matchesQuery`
 * over label, description and keywords); nothing typed shows every option. ↑ ↓ Home End move, Enter picks, Esc closes the list
 * only (not the modal or drawer around it). Tab or leaving without a pick keeps the value. The list sits under the field without a
 * portal, so it works inside modals and drawers (their body scrolls to show it). 44px rows under md.
 */
export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  { id, name, options, value, onChange, onBlur, listLabel, placeholder, noMatchesText = "No matches", disabled, invalid, "aria-describedby": describedBy, className },
  ref,
) {
  const autoId = React.useId();
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-opt-${i}`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  // What the user is typing; null = not typing, the field shows the chosen option.
  const [query, setQuery] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(-1);

  const selected = options.find((o) => o.value === value);
  const selectedText = selected ? (selected.selectedLabel ?? selected.label) : "";
  const filter = (q: string | null) => (q ? options.filter((o) => matchesQuery(q, [o.label, o.description, o.keywords])) : options);
  const shown = filter(query);
  const showClear = !disabled && (value !== "" || Boolean(query));

  const setRefs = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  const openWith = (q: string | null) => {
    const list = filter(q);
    setQuery(q);
    setActive(initialActive(Boolean(q), list.length, list.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = React.useCallback(() => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  }, []);
  const pick = (o: ComboboxOption) => {
    close();
    onChange(o.value);
  };

  // Esc closes the list only: caught on window before the dialog's own (document, capture) listener sees it.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  // Opening: bring the list into view in a scrolling modal or drawer. Moving: keep the highlighted option in view.
  React.useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  React.useEffect(() => {
    if (open && active >= 0) document.getElementById(`${autoId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, autoId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      // Never submits the form from here (like a native select).
      e.preventDefault();
      if (!open) openWith(null);
      else if (shown[active]) pick(shown[active]);
      return;
    }
    if (e.key === "Tab") {
      // Leaves without picking; what was typed is dropped.
      close();
      return;
    }
    if (!isMoveKey(e.key)) return;
    if (!open) {
      // Home / End move the caret while the list is closed.
      if (e.key === "Home" || e.key === "End") return;
      e.preventDefault();
      openWith(null);
      return;
    }
    e.preventDefault();
    setActive(moveActive(e.key, active, shown.length));
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onBlur={(e) => {
        // Moving between the field and the clear button isn't leaving.
        if (rootRef.current?.contains(e.relatedTarget)) return;
        close();
        onBlur?.();
      }}
    >
      <Input
        ref={setRefs}
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 && active < shown.length ? optionId(active) : undefined}
        aria-describedby={describedBy}
        invalid={invalid}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={cn("truncate pr-9", showClear && "pr-16 max-md:pr-20")}
        value={query ?? selectedText}
        onChange={(e) => openWith(e.target.value)}
        onClick={() => {
          // Select the chosen text so typing replaces it.
          if (query === null) inputRef.current?.select();
          if (!open) openWith(query);
        }}
        onFocus={() => inputRef.current?.select()}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          aria-label={`Clear ${listLabel.toLowerCase()}`}
          // Keep focus in the field.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            close();
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-8 top-1 inline-flex size-8 items-center justify-center rounded-badge text-text-muted hover:bg-surface-3 hover:text-text-primary focus-visible:focus-ring max-md:-top-0.5 max-md:size-11"
        >
          <X aria-hidden size={16} strokeWidth={1.5} />
        </button>
      )}
      <ChevronDown aria-hidden size={16} strokeWidth={1.5} className="pointer-events-none absolute right-3 top-3 text-text-muted" />
      {open && (
        <div
          ref={panelRef}
          // A scrolling box is a Tab stop in some browsers; the arrow keys move through the list instead.
          tabIndex={-1}
          // Keep focus in the field while clicking or scrolling the list.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-card border border-border-subtle bg-overlay p-1.5 shadow-overlay"
        >
          <ul id={listId} role="listbox" aria-label={listLabel} className="m-0 flex list-none flex-col p-0">
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={o.value === value}
                onClick={() => pick(o)}
                onMouseMove={() => i !== active && setActive(i)}
                className={cn(
                  "flex cursor-pointer flex-col justify-center rounded-badge px-2.5 py-2 text-body text-text-primary max-md:min-h-11",
                  i === active && "bg-surface-3",
                  o.value === value && "font-semibold",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.description && <span className="truncate text-small font-normal text-text-secondary">{o.description}</span>}
              </li>
            ))}
          </ul>
          {shown.length === 0 && <div className="px-2.5 py-2 text-body text-text-secondary">{noMatchesText}</div>}
        </div>
      )}
      <span role="status" className="sr-only">
        {open && query ? (shown.length === 0 ? noMatchesText : `${shown.length} ${shown.length === 1 ? "match" : "matches"}`) : ""}
      </span>
    </div>
  );
});
