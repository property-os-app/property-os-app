/**
 * A property's accent colour (the thin bar on its band in grouped grids): one of the 5 design system group accents
 * (--group-1 ... --group-5, never a status colour). Picked by the property's position in the full property list sorted by
 * name A→Z (the order the grids show the groups in, from the API), then id, mod 5: properties next to each other on screen
 * always differ. The full list (not the filtered one) is used, so a property keeps its colour when a filter hides others;
 * adding a property may shift the colours of the ones after it. A property not in the list falls back to a hash of its id.
 */

export const GROUP_ACCENT_COUNT = 5;

/** Static strings, so Tailwind generates every class. Index = accent slot. */
const COLORS = ["var(--group-1)", "var(--group-2)", "var(--group-3)", "var(--group-4)", "var(--group-5)"] as const;
const BAR_CLASSES = [
  "shadow-[inset_4px_0_0_var(--group-1)]",
  "shadow-[inset_4px_0_0_var(--group-2)]",
  "shadow-[inset_4px_0_0_var(--group-3)]",
  "shadow-[inset_4px_0_0_var(--group-4)]",
  "shadow-[inset_4px_0_0_var(--group-5)]",
] as const;

export interface GroupAccent {
  /** 0–4. */
  slot: number;
  /** CSS colour, e.g. "var(--group-3)". */
  color: string;
  /** A 4px bar on the left edge (inset shadow), for cards. */
  barClass: string;
}

/** property id -> position in the list sorted by name, then id. */
export type AccentOrder = ReadonlyMap<string, number>;

/** Names A→Z like the API (letters before case and accents; "746 …" before "8 …"). */
const collator = new Intl.Collator("en-US", { sensitivity: "base" });

/** The order from the full property list (any order in; sorted by name A→Z, then id), matching the grids' group order. */
export function accentOrderOf(properties: readonly { id: string; name: string }[]): AccentOrder {
  const sorted = [...properties].sort((a, b) => collator.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Map(sorted.map((p, i) => [p.id, i]));
}

/** FNV-1a (32-bit): a stable number from a string, the fallback for ids not in the list. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The accent of a property: its list position mod 5, or the hash of its id when it isn't in `order`. */
export function groupAccent(id: string, order?: AccentOrder): GroupAccent {
  const position = order?.get(id);
  const slot = (position ?? hashId(id)) % GROUP_ACCENT_COUNT;
  return { slot, color: COLORS[slot], barClass: BAR_CLASSES[slot] };
}
