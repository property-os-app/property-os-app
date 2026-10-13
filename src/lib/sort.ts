/** Sorting helpers shared by tables and lists. */

const collator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

/** Numeric-aware, case-insensitive text compare: "2" before "10", "4b" equals "4B". Use for unit numbers and names. */
export function compareNatural(a: string, b: string): number {
  return collator.compare(a, b);
}
