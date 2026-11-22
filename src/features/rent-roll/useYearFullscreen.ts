import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * The Full screen state of the yearly table: `open()` remembers the page's scroll position; after `close()` the page comes
 * back at the same place and focus returns to the Full screen button.
 */
export function useYearFullscreen(buttonRef: RefObject<HTMLButtonElement | null>) {
  const [isOpen, setIsOpen] = useState(false);
  const savedY = useRef<number | null>(null);
  const open = () => {
    savedY.current = window.scrollY;
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);
  useLayoutEffect(() => {
    if (isOpen || savedY.current === null) return;
    const y = savedY.current;
    savedY.current = null;
    window.scrollTo(0, y);
    buttonRef.current?.focus({ preventScroll: true });
    // Leaving browser full screen resizes the window a moment later: put the scroll back once more after that.
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, buttonRef]);
  return { isOpen, open, close };
}
