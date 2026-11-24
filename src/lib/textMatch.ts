/**
 * Forgiving text search for pickers: case, accents and punctuation don't matter ("chamara" finds "Cha'Mara",
 * "marie louise" finds "Marie-Louise").
 */

/** Lower case, accents removed, everything but letters, digits and spaces dropped, single spaces. */
export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every typed word is somewhere in the texts. Nothing typed (or only punctuation) matches everything. */
export function matchesQuery(query: string, texts: readonly (string | null | undefined)[]): boolean {
  const folded = foldText(query);
  if (!folded) return true;
  const haystack = texts.map((t) => foldText(t ?? "")).join(" ");
  return folded.split(" ").every((word) => haystack.includes(word));
}
