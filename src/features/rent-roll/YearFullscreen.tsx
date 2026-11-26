import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/atoms";
import { enterBrowserFullscreen, exitBrowserFullscreen, leftBrowserFullscreen, type FullscreenMode } from "@/lib/fullscreen";
import { YearLegend } from "@/features/rent-roll/YearLegend";

/** True while a Radix dialog (a drawer or modal opened from the full-screen table) is open: Esc is then theirs. */
const otherDialogOpen = () => document.querySelector('[role="dialog"][data-state="open"]') !== null;

export interface YearFullscreenProps {
  year: number;
  /** Called after browser full screen (if any) has been left. */
  onClose: () => void;
  /** The yearly table, made to fill the layer (YearTable `fill`). */
  children: ReactNode;
}

/**
 * The yearly table over the whole window (above the menu and the top bar), portaled to <body>: a slim header with the title,
 * the colour key (from xl) and "Exit full screen". Also asks the browser for real full screen on the document, so its bars
 * hide too; if that's refused or unsupported, the in-app layer stays. Focus starts on ✕; Esc or ✕ closes; if the browser
 * leaves full screen by itself (fullscreenchange) the layer closes too. The app behind is inert and doesn't scroll.
 * Menus and modals opened from the table portal to <body> above the layer (z-40/50), so they show in full screen too.
 */
export function YearFullscreen({ year, onClose, children }: YearFullscreenProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const mode = useRef<FullscreenMode | null>(null);
  const closed = useRef(false);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  const close = () => {
    if (closed.current) return;
    closed.current = true;
    void exitBrowserFullscreen().then(() => onCloseRef.current());
  };
  const closeLatest = useRef(close);
  useLayoutEffect(() => {
    closeLatest.current = close;
  });

  // A layout effect, so on close its cleanup (inert off, page scroll unlocked) runs before useYearFullscreen restores the
  // scroll position and focus (a passive cleanup would run after, and focus() on an inert page does nothing).
  useLayoutEffect(() => {
    closeRef.current?.focus();
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";

    // The mode only ever goes up to "browser" (a second, overlapping request, e.g. React StrictMode running this twice in
    // development, is refused and must not undo the first); fullscreenchange confirms it too.
    void enterBrowserFullscreen().then((m) => {
      if (m === "browser") mode.current = "browser";
      // Closed while the browser was still answering: leave the browser full screen we just got.
      if (closed.current) void exitBrowserFullscreen();
    });
    const onChange = () => {
      if (document.fullscreenElement) {
        mode.current = "browser";
        return;
      }
      if (leftBrowserFullscreen(mode.current)) closeLatest.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || otherDialogOpen()) return;
      e.preventDefault();
      closeLatest.current();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
      root?.removeAttribute("inert");
      html.style.overflow = overflow;
      // Unmounted another way (e.g. a row opened a lease page): don't leave the browser in full screen.
      void exitBrowserFullscreen();
    };
  }, []);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="year-fullscreen-title" className="fixed inset-0 z-30 flex flex-col bg-bg text-text-primary">
      <div className="flex min-h-14 shrink-0 items-center gap-4 border-b border-border-subtle bg-surface-1 px-4 py-2">
        <h2 id="year-fullscreen-title" className="m-0 shrink-0 text-h3 font-bold">
          Rent Roll {year}
        </h2>
        <YearLegend className="hidden min-w-0 flex-1 xl:flex" />
        <Button ref={closeRef} variant="ghost" icon={<X size={16} strokeWidth={1.5} />} onClick={close} className="ml-auto shrink-0">
          Exit full screen
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>,
    document.body,
  );
}
