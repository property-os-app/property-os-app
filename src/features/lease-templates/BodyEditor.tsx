import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Bold, Braces, Heading2, Italic, List, ListOrdered, Minus, Quote } from "lucide-react";
import { Button, Textarea } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { insertAtCursor, insertBlock, mergeToken, prefixLines, wrapSelection, type TextEdit } from "@/features/lease-templates/markdown";
import { InsertFieldModal } from "@/features/lease-templates/InsertFieldModal";

interface Props {
  id: string;
  /** register("body"); the textarea stays uncontrolled. */
  field: UseFormRegisterReturn<"body">;
  /** Writes the edited text into the form (setValue with shouldDirty). */
  onEdit: (text: string) => void;
  invalid?: boolean;
  /** Archived template: the text can't change (no toolbar, read-only textarea). */
  locked?: boolean;
  /** Set by FormField (help or error text). */
  "aria-describedby"?: string;
}

type Tool = { label: string; icon: ReactNode; shortcut?: string; run: (text: string, start: number, end: number) => TextEdit };

const icon = { size: 16, strokeWidth: 1.5 };

const TOOLS: Tool[] = [
  { label: "Heading", icon: <Heading2 {...icon} />, run: (t, s, e) => prefixLines(t, s, e, "## ") },
  { label: "Bold", icon: <Bold {...icon} />, shortcut: "b", run: (t, s, e) => wrapSelection(t, s, e, "**", "bold text") },
  { label: "Italic", icon: <Italic {...icon} />, shortcut: "i", run: (t, s, e) => wrapSelection(t, s, e, "*", "italic text") },
  { label: "Bulleted list", icon: <List {...icon} />, run: (t, s, e) => prefixLines(t, s, e, "- ") },
  { label: "Numbered list", icon: <ListOrdered {...icon} />, run: (t, s, e) => prefixLines(t, s, e, "numbered") },
  { label: "Divider", icon: <Minus {...icon} />, run: (t, s, e) => insertBlock(t, s, e, "---") },
  { label: "Quote", icon: <Quote {...icon} />, run: (t, s, e) => prefixLines(t, s, e, "> ") },
];

/**
 * The template body: a Markdown textarea with a toolbar (heading, bold, italic, lists, divider, quote) that edits at the
 * cursor, plus "Insert field" (InsertFieldModal) that puts {{key}} where the cursor was. Ctrl/⌘+B and +I work in the textarea.
 * Toolbar edits replace the text through the form, so the browser's own undo doesn't cover them.
 */
export function BodyEditor({ id, field, onEdit, invalid, locked, "aria-describedby": describedBy }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // The selection when "Insert field" opened (the modal takes the focus).
  const savedSel = useRef<[number, number]>([0, 0]);
  const [inserting, setInserting] = useState(false);

  const apply = (make: (text: string, start: number, end: number) => TextEdit, sel?: [number, number]) => {
    const ta = ref.current;
    if (!ta) return;
    const [start, end] = sel ?? [ta.selectionStart, ta.selectionEnd];
    const edit = make(ta.value, start, end);
    onEdit(edit.text);
    // After the form wrote the new value: focus and restore the selection.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(edit.selStart, edit.selEnd);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const tool = TOOLS.find((t) => t.shortcut === e.key.toLowerCase());
    if (!tool) return;
    e.preventDefault();
    apply(tool.run);
  };

  const openInsert = () => {
    const ta = ref.current;
    savedSel.current = ta ? [ta.selectionStart, ta.selectionEnd] : [0, 0];
    setInserting(true);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-control border bg-surface-2 transition-colors duration-fast",
        "focus-within:border-success focus-within:ring-2 focus-within:ring-[var(--focus-ring)]",
        invalid ? "border-danger" : "border-border-strong",
      )}
    >
      {!locked && (
        <div role="toolbar" aria-label="Formatting" aria-controls={id} className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle px-1.5 py-1">
          {TOOLS.map((t) => (
            <Button
              key={t.label}
              variant="ghost"
              size="sm"
              iconOnly
              icon={t.icon}
              aria-label={t.label}
              title={t.shortcut ? `${t.label} (Ctrl+${t.shortcut.toUpperCase()})` : t.label}
              // Keep the textarea's selection: don't take the focus on press.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(t.run)}
              className="max-md:size-11"
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={<Braces {...icon} />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={openInsert}
            className="ml-auto max-md:min-h-11"
          >
            Insert field
          </Button>
        </div>
      )}
      <Textarea
        id={id}
        {...field}
        ref={(el) => {
          field.ref(el);
          ref.current = el;
        }}
        onKeyDown={onKeyDown}
        readOnly={locked}
        invalid={invalid}
        aria-describedby={describedBy}
        spellCheck
        className="min-h-80 rounded-none border-0 bg-transparent font-mono focus:ring-0 md:min-h-96"
      />
      {inserting && (
        <InsertFieldModal onPick={(f) => apply((t, s, e) => insertAtCursor(t, s, e, mergeToken(f.key)), savedSel.current)} onClose={() => setInserting(false)} />
      )}
    </div>
  );
}
