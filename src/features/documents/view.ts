import { apiFetch } from "@/lib/api";
import type { DocumentDownload } from "@/types/document";

/** The parts of a browser tab that View uses (a real `Window`, or a fake in tests). */
export interface ViewTab {
  opener: unknown;
  location: { href: string };
  document?: { title: string; body: { textContent: string | null } | null };
  close(): void;
}

/** Shown when the browser blocks the new tab. */
export const POPUP_BLOCKED_MESSAGE = "Your browser blocked the new tab. Allow pop-ups for this site.";

const OPENING_TEXT = "Opening document…";

/**
 * Opens a blank tab. Call it in the click handler itself, before any await, or popup blockers stop it. The opener is
 * cut (`noopener` would make `window.open` return null, so it's done by hand) and the tab shows "Opening document…" as
 * plain text while the link loads. null when the browser blocked the tab.
 */
export function openBlankTab(open: () => ViewTab | null = () => window.open("", "_blank")): ViewTab | null {
  const tab = open();
  if (!tab) return null;
  tab.opener = null;
  try {
    if (tab.document) {
      tab.document.title = OPENING_TEXT;
      if (tab.document.body) tab.document.body.textContent = OPENING_TEXT;
    }
  } catch {
    // The placeholder text is only a nicety; the tab still gets the link.
  }
  return tab;
}

/** GET /documents/:id/download?inline=true: a fresh 5-minute link that opens the PDF or image in the tab. Never stored. */
export function fetchViewLink(docId: string): Promise<DocumentDownload> {
  return apiFetch<DocumentDownload>(`/documents/${encodeURIComponent(docId)}/download`, { query: { inline: true } });
}

/** Gets the inline link and points the tab at it. On failure the tab is closed and the error is rethrown (the caller shows a toast). */
export async function showInTab(tab: ViewTab, docId: string, fetchLink: (docId: string) => Promise<DocumentDownload> = fetchViewLink): Promise<void> {
  try {
    const { url } = await fetchLink(docId);
    tab.location.href = url;
  } catch (err) {
    tab.close();
    throw err;
  }
}
