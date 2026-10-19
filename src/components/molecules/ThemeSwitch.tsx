import * as React from "react";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/atoms/Button";

export interface ThemeSwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  /** true = dark. */
  checked: boolean;
  /** The new value, and the click event (e.g. to start an effect from the switch's position). */
  onChange: (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => void;
}

// 8 rays around the sun (24×24 view box), from radius 7.5 to 10.
const rays = [
  [12, 2, 12, 4.5], [12, 19.5, 12, 22], [2, 12, 4.5, 12], [19.5, 12, 22, 12],
  [4.93, 4.93, 6.7, 6.7], [17.3, 17.3, 19.07, 19.07], [4.93, 19.07, 6.7, 17.3], [17.3, 6.7, 19.07, 4.93],
];

const motion = "transition-[opacity,scale,translate,rotate] duration-300 ease-out motion-reduce:transition-none";

/**
 * Light/dark switch styled as a Topbar ghost icon button. One icon that morphs:
 * sun (circle + rays) ↔ crescent moon, in currentColor. 44×44 tap area on phones. Reduced motion: instant.
 */
export function ThemeSwitch({ checked, onChange, className, onClick, ...props }: ThemeSwitchProps) {
  // The mask needs a document-unique id that is safe inside url(#...).
  const maskId = `theme-switch-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Dark mode"
      title={checked ? "Switch to light mode" : "Switch to dark mode"}
      onClick={(e) => {
        onClick?.(e);
        onChange(!checked, e);
      }}
      // after: grows the tap area to 44×44 without changing the 40px look.
      className={cn(buttonVariants({ variant: "ghost", iconOnly: true }), "relative after:absolute after:-inset-0.5", className)}
      {...props}
    >
      <svg aria-hidden viewBox="0 0 24 24" className={cn("size-5 overflow-visible", motion, checked ? "rotate-0" : "rotate-45")}>
        <mask id={maskId}>
          {/* Mask luminance, not colors: white keeps, black cuts. */}
          <rect width="24" height="24" fill="white" />
          {/* The cutter: off to the corner for the sun, over the top right of the circle for the moon. */}
          <circle cx="12" cy="12" r="8" fill="black" className={cn(motion, checked ? "translate-x-[6px] -translate-y-[6px]" : "translate-x-[14px] -translate-y-[14px]")} />
        </mask>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="currentColor"
          mask={`url(#${maskId})`}
          className={cn("origin-center [transform-box:fill-box]", motion, checked ? "scale-100" : "scale-[0.5]")}
        />
        <g
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          className={cn("origin-center [transform-box:fill-box]", motion, checked ? "scale-0 opacity-0" : "scale-100 opacity-100")}
        >
          {rays.map(([x1, y1, x2, y2]) => (
            <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
          ))}
        </g>
      </svg>
    </button>
  );
}
