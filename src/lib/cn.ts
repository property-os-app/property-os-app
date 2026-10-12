import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge needs to know the custom type scale, otherwise it treats
 * `text-hero` as a color and drops it when `text-text-primary` follows.
 */
const typeScale = ["hero", "display", "h1", "h2", "h3", "body", "body-lg", "small", "caption", "overline"];
const colorTokens = [
  "bg", "surface-1", "surface-2", "surface-3", "overlay", "border-subtle", "border-strong",
  "text-primary", "text-secondary", "text-muted",
  "success", "success-dark", "success-soft", "success-fg", "danger", "danger-soft", "warning", "warning-soft",
  "info", "info-soft", "ai", "ai-soft", "scrim",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: colorTokens,
      radius: ["badge", "control", "card", "overlay", "pill"],
      shadow: ["overlay"],
      spacing: ["sidebar", "sidebar-collapsed", "topbar", "drawer", "drawer-lg", "drawer-xl", "modal", "modal-lg"],
    },
    classGroups: {
      "font-size": [{ text: typeScale }],
      duration: ["duration-fast", "duration-overlay", "duration-draw"],
      ease: ["ease-overlay"],
      animate: ["animate-hazard", "animate-shimmer"],
    },
  },
});

/** Merge Tailwind class lists without duplicate-utility conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
