/** Opening and saving the PDFs the API returns (lease document, template previews). No firebase import, so it is unit-testable. */

/**
 * The filename in a Content-Disposition header: `filename*=UTF-8''…` (decoded) wins over `filename="…"` or a bare
 * `filename=…`. null when the header or the name is missing.
 */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(header);
  if (star) {
    try {
      const name = decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
      if (name) return name;
    } catch {
      // Bad escape: fall back to the plain filename.
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/.exec(header);
  const name = (plain?.[1] ?? plain?.[2] ?? "").trim();
  return name || null;
}

/** How long a blob URL opened in another tab stays valid; that tab has loaded it long before. */
const NEW_TAB_URL_LIFETIME_MS = 60_000;

/**
 * Opens a PDF in a new tab. The tab opens right away (inside the click, or the browser blocks it as a pop-up) showing
 * "Loading PDF...", then goes to the blob URL once `load` resolves. On failure the tab closes and the error is rethrown.
 * The object URL is freed after a minute.
 */
export async function openPdfInNewTab(load: () => Promise<Blob>): Promise<void> {
  const tab = window.open("", "_blank");
  if (tab) {
    tab.opener = null;
    try {
      tab.document.title = "Loading PDF...";
      tab.document.body.textContent = "Loading PDF...";
    } catch {
      // Some browsers don't let us write into the blank tab; it just stays empty until the PDF loads.
    }
  }
  let blob: Blob;
  try {
    blob = await load();
  } catch (err) {
    tab?.close();
    throw err;
  }
  const url = URL.createObjectURL(blob);
  if (tab && !tab.closed) tab.location.href = url;
  // Pop-up blocked or closed meanwhile: open it in this tab's browser instead of losing it.
  else window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), NEW_TAB_URL_LIFETIME_MS);
}

/** Saves a blob as a file named `filename` (a temporary <a download>), then frees the object URL. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the URL goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
