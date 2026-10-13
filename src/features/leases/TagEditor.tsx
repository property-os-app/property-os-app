import { useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { Button, Caption, Input, Tag } from "@/components/atoms";
import { useTagSuggestions } from "@/features/leases/hooks";
import { MAX_TAG_LENGTH, MAX_TAGS, normalizeTag } from "@/features/leases/stats";

const MAX_SUGGESTIONS = 8;

export interface TagEditorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Saving (drawer): chips and the input are disabled. */
  disabled?: boolean;
  /** Prefix for element ids (two editors can be on screen: drawer + wizard). */
  idPrefix: string;
}

/**
 * Tag chips with remove (x) and a "+ Add tag" control: an input (Enter or comma adds) and suggestion chips
 * from GET /leases/tag-suggestions. Enforces the tag rules: trimmed, spaces collapsed, no case-insensitive duplicates,
 * max 10, each max 30 characters.
 */
export function TagEditor({ value, onChange, disabled, idPrefix }: TagEditorProps) {
  const suggestions = useTagSuggestions();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const taken = new Set(value.map((t) => t.toLowerCase()));
  const full = value.length >= MAX_TAGS;
  const term = normalizeTag(text).toLowerCase();
  const shown = (suggestions.data ?? []).filter((s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(term)).slice(0, MAX_SUGGESTIONS);

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (tag.length > MAX_TAG_LENGTH) return setError(`Tags can be at most ${MAX_TAG_LENGTH} characters.`);
    if (taken.has(tag.toLowerCase())) return setError(`"${tag}" is already added.`);
    if (full) return setError(`A lease can have at most ${MAX_TAGS} tags.`);
    setError(null);
    setText("");
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter must not submit the wizard form.
      e.preventDefault();
      add(text);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((tag) => (
          <Tag key={tag} onRemove={disabled ? undefined : () => onChange(value.filter((t) => t !== tag))}>
            {tag}
          </Tag>
        ))}
        {!adding && !full && !disabled && (
          <Button size="sm" variant="ghost" icon={<Plus size={14} strokeWidth={1.5} />} onClick={() => setAdding(true)}>
            Add tag
          </Button>
        )}
        {value.length === 0 && (adding || disabled) && <Caption>No tags yet</Caption>}
      </div>

      {adding && !full && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              id={`${idPrefix}-tag-input`}
              aria-label="New tag"
              placeholder="Type a tag and press Enter"
              autoFocus
              maxLength={60}
              value={text}
              invalid={Boolean(error)}
              disabled={disabled}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              onKeyDown={onKeyDown}
            />
            <Button disabled={disabled || !normalizeTag(text)} onClick={() => add(text)}>
              Add
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setText(""); setError(null); }}>
              Done
            </Button>
          </div>
          {error && <Caption className="text-danger">{error}</Caption>}
          {shown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Caption>Suggestions:</Caption>
              {shown.map((s) => (
                <button key={s} type="button" disabled={disabled} onClick={() => add(s)} className="rounded-pill focus-visible:focus-ring">
                  <Tag className="cursor-pointer hover:bg-surface-3 hover:text-text-primary">+ {s}</Tag>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {full && <Caption>{MAX_TAGS} tags maximum.</Caption>}
    </div>
  );
}
