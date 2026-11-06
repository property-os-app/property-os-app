import { useEffect, useEffectEvent } from "react";

/** Anything open on top of the page: Radix Modal / Drawer / ConfirmDialog, and the KebabMenu panel. */
const OPEN_LAYER = '[role="dialog"], [role="alertdialog"], [role="menu"]';
/** Input types with no text to edit, so Esc there can still close the page. */
const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit"]);

type FocusedElement = { tagName: string; isContentEditable?: boolean; type?: string };

/** Text fields keep Esc for themselves. A select counts too: Esc closes its open list. */
function isTextField(el: FocusedElement | null): boolean {
  if (!el) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.tagName === "INPUT" && !NON_TEXT_INPUTS.has(el.type ?? "text");
}

type EscapeEvent = Pick<KeyboardEvent, "key" | "repeat" | "isComposing" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;
type PageDocument = { activeElement: FocusedElement | null; querySelector(selector: string): unknown };

/** True when this key press should close the page: a plain, single Esc with no layer open and no text field focused. */
export function canEscapeClose(e: EscapeEvent, doc: PageDocument): boolean {
  if (e.key !== "Escape" || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  return !doc.querySelector(OPEN_LAYER) && !isTextField(doc.activeElement);
}

/**
 * Calls `onClose` on Esc (see `canEscapeClose`). Listens on window in the capture phase so it runs before Radix and
 * KebabMenu handle the same key: later, the layer they just closed is already gone and one Esc would close both.
 */
export function useEscapeClose(onClose: () => void) {
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (canEscapeClose(e, document)) close();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}
