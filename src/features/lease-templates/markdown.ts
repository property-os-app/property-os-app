/**
 * Text helpers for the template body editor: toolbar edits at the cursor and merge field checks. Pure functions on a string
 * and a selection, so they are unit-tested without a textarea. Body rules: ../property-os-api/docs/frontend-handoff/API.md
 * ("Lease templates", Body format).
 */
import type { MergeField } from "@/types/leaseTemplate";

/** Body length after trimming (API.md: 1–50,000 characters). */
export const MAX_BODY_LENGTH = 50_000;

/** The textarea's text and selection after an edit. */
export interface TextEdit {
  text: string;
  selStart: number;
  selEnd: number;
}

/** Replaces the selection with `insert` (or inserts it at the cursor); the cursor ends up right after it. */
export function insertAtCursor(text: string, start: number, end: number, insert: string): TextEdit {
  const next = text.slice(0, start) + insert + text.slice(end);
  const at = start + insert.length;
  return { text: next, selStart: at, selEnd: at };
}

/**
 * Wraps the selection in `marker` ("**" bold, "*" italic). Spaces at the edges of the selection stay outside the markers
 * (Markdown ignores "** bold **"). An empty selection inserts marker + `placeholder` + marker with the placeholder selected,
 * ready to type over. A selection that is already wrapped (markers right outside it) is unwrapped.
 */
export function wrapSelection(text: string, start: number, end: number, marker: string, placeholder: string): TextEdit {
  const m = marker.length;
  // Toggle off: "**word**" with "word" selected.
  if (start >= m && text.slice(start - m, start) === marker && text.slice(end, end + m) === marker && !isLongerRun(text, start, end, marker)) {
    const next = text.slice(0, start - m) + text.slice(start, end) + text.slice(end + m);
    return { text: next, selStart: start - m, selEnd: end - m };
  }
  const selected = text.slice(start, end);
  const inner = selected.trim();
  if (!inner) {
    const next = text.slice(0, start) + marker + placeholder + marker + text.slice(end);
    return { text: next, selStart: start + m, selEnd: start + m + placeholder.length };
  }
  const lead = selected.length - selected.trimStart().length;
  const innerStart = start + lead;
  const innerEnd = innerStart + inner.length;
  const next = text.slice(0, innerStart) + marker + inner + marker + text.slice(innerEnd);
  return { text: next, selStart: innerStart + m, selEnd: innerEnd + m };
}

/** "*" around "**bold**" is part of a longer run: "*" must not unwrap bold text. */
function isLongerRun(text: string, start: number, end: number, marker: string): boolean {
  const ch = marker[0];
  return text[start - marker.length - 1] === ch || text[end + marker.length] === ch;
}

/** Start and end (exclusive, before the newline) of the lines the selection touches. */
function lineRange(text: string, start: number, end: number): [number, number] {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  // A selection ending right after a newline doesn't include the next line.
  const last = end > start && text[end - 1] === "\n" ? end - 1 : end;
  const nl = text.indexOf("\n", last);
  return [from, nl === -1 ? text.length : nl];
}

const NUMBERED = /^\d+\.\s/;

/**
 * Starts every line the selection touches with `prefix` ("## " heading, "- " bullet, "> " quote) or with "1. ", "2. "…
 * (`"numbered"`). Blank lines are skipped. When every non-blank line already has it, it is removed instead (toggle).
 * A heading replaces another heading level ("### " becomes "## "). The new selection covers the edited lines.
 */
export function prefixLines(text: string, start: number, end: number, prefix: string | "numbered"): TextEdit {
  const [from, to] = lineRange(text, start, end);
  const lines = text.slice(from, to).split("\n");
  const filled = lines.filter((l) => l.trim() !== "");
  const has = (l: string) => (prefix === "numbered" ? NUMBERED.test(l) : l.startsWith(prefix));
  const removing = filled.length > 0 && filled.every(has);

  let n = 0;
  const edited = lines.map((line) => {
    if (line.trim() === "") return line;
    if (removing) return prefix === "numbered" ? line.replace(NUMBERED, "") : line.slice(prefix.length);
    if (prefix === "numbered") {
      n += 1;
      return `${n}. ${line.replace(NUMBERED, "")}`;
    }
    if (prefix.startsWith("#")) return prefix + line.replace(/^#{1,6}\s/, "");
    return prefix + line;
  });
  // Only blank lines (e.g. the cursor on an empty line): add the prefix where the line starts, cursor after it, ready to type.
  if (filled.length === 0) {
    const single = prefix === "numbered" ? "1. " : prefix;
    const at = from + single.length;
    return { text: text.slice(0, from) + single + text.slice(from), selStart: at, selEnd: at };
  }
  const block = edited.join("\n");
  return { text: text.slice(0, from) + block + text.slice(to), selStart: from, selEnd: from + block.length };
}

/**
 * Inserts a block ("---") on its own line with a blank line before and after (Markdown needs them, or "---" under a
 * paragraph becomes a heading). Replaces the selection; the cursor goes to the line after the block.
 */
export function insertBlock(text: string, start: number, end: number, block: string): TextEdit {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before === "" ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const inserted = lead + block + trail;
  const next = before + inserted + after;
  // Cursor at the start of the line after the blank line.
  const at = before.length + inserted.length + (after.startsWith("\n\n") ? 2 : after.startsWith("\n") ? 1 : 0);
  return { text: next, selStart: Math.min(at, next.length), selEnd: Math.min(at, next.length) };
}

/** The text that inserts a merge field. */
export function mergeToken(key: string): string {
  return `{{${key}}}`;
}

/** Every merge key used in the body, each once, in order of first use. "{{ key }}" counts as "key"; "{{}}" and "{{ }}" are plain text. */
export function mergeKeysIn(body: string): string[] {
  const keys: string[] = [];
  for (const match of body.matchAll(/\{\{([^{}]*)\}\}/g)) {
    const key = match[1].trim();
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** Keys in the body that aren't in the merge field catalog (the backend rejects them with 400 "Unknown merge fields: …"). */
export function unknownMergeKeys(body: string, fields: MergeField[]): string[] {
  const known = new Set(fields.map((f) => f.key));
  return mergeKeysIn(body).filter((k) => !known.has(k));
}

/** One menu group of merge fields. */
export interface MergeFieldGroup {
  group: string;
  fields: MergeField[];
}

/** Fields grouped by `group` in API order, keeping only those whose label, key, group or sample contains `query` (any case). Empty groups are left out. */
export function groupMergeFields(fields: MergeField[], query = ""): MergeFieldGroup[] {
  const q = query.trim().toLowerCase();
  const groups: MergeFieldGroup[] = [];
  for (const f of fields) {
    if (q && ![f.label, f.key, f.group, f.sample].some((s) => s.toLowerCase().includes(q))) continue;
    let g = groups.find((x) => x.group === f.group);
    if (!g) {
      g = { group: f.group, fields: [] };
      groups.push(g);
    }
    g.fields.push(f);
  }
  return groups;
}
