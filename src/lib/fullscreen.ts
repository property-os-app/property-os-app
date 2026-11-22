/**
 * Browser full screen (the Fullscreen API) as an extra on top of an in-app full-window layer: asking may be refused or
 * unsupported (iPhone Safari), and the browser can leave full screen by itself (Esc, its own button). Never throws.
 * The document element is what goes full screen, so drawers, dialogs and toasts portaled to <body> still show above the layer.
 */

/** "browser": the browser is in full screen too; "window": only our in-app layer (refused or not supported). */
export type FullscreenMode = "browser" | "window";

export interface FullscreenDoc {
  fullscreenElement: Element | null;
  fullscreenEnabled?: boolean;
  exitFullscreen?: () => Promise<void>;
}

export interface FullscreenTarget {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
}

/** Asks the browser for full screen; "window" when it isn't supported or the request is refused. */
export async function enterBrowserFullscreen(
  target: FullscreenTarget = document.documentElement,
  doc: FullscreenDoc = document,
): Promise<FullscreenMode> {
  if (!doc.fullscreenEnabled || typeof target.requestFullscreen !== "function") return "window";
  try {
    await target.requestFullscreen({ navigationUI: "hide" });
    return "browser";
  } catch {
    return "window";
  }
}

/** Leaves browser full screen, only when something is in it (exitFullscreen rejects otherwise). */
export async function exitBrowserFullscreen(doc: FullscreenDoc = document): Promise<void> {
  if (!doc.fullscreenElement || typeof doc.exitFullscreen !== "function") return;
  try {
    await doc.exitFullscreen();
  } catch {
    // Already left (e.g. the user pressed Esc at the same moment).
  }
}

/** On `fullscreenchange`: true when we were in browser full screen and the browser has now left it (close our layer too). */
export function leftBrowserFullscreen(mode: FullscreenMode | null, doc: FullscreenDoc = document): boolean {
  return mode === "browser" && !doc.fullscreenElement;
}
