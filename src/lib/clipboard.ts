/**
 * Copies text and reports whether it worked. Never throws.
 * The Clipboard API exists only on https and localhost; on plain http (the phone at http://192.168.x.x:5173) it is
 * missing, so a hidden textarea + execCommand("copy") is the fallback (deprecated, but iOS Safari and Android Chrome
 * still support it). The textarea goes inside the open dialog, if any: Radix traps focus there and would pull it back
 * from a textarea outside, losing the selection.
 */
export async function copyText(text: string, anchor?: Element | null): Promise<boolean> {
  try {
    if (globalThis.isSecureContext && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback.
  }
  return legacyCopy(text, anchor);
}

function legacyCopy(text: string, anchor?: Element | null): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement("textarea");
  try {
    area.value = text;
    area.setAttribute("readonly", "");
    // Off screen but selectable; 16px so iOS doesn't zoom in.
    Object.assign(area.style, { position: "fixed", top: "0", left: "-9999px", opacity: "0", fontSize: "16px" });
    (anchor?.closest('[role="dialog"]') ?? document.body).appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus({ preventScroll: true });
  }
}
