import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-control border border-transparent font-sans font-semibold text-body",
    "transition-colors duration-fast ease-out cursor-pointer",
    "focus-visible:focus-ring disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        /** Green fill with dark text. One per view. */
        primary: "bg-success text-success-fg hover:bg-success-dark",
        secondary: "bg-surface-2 border-border-strong text-text-primary hover:bg-surface-3",
        ghost: "bg-transparent text-text-secondary hover:bg-surface-3 hover:text-text-primary",
        danger: "bg-danger-solid text-white hover:opacity-90",
        /** Violet outline with sparkle, AI actions only. */
        ai: "bg-transparent border-ai text-ai hover:bg-ai-soft",
      },
      size: {
        sm: "h-8 px-3 text-small",
        md: "h-10 px-4",
        /** Mobile primary */
        lg: "h-12 px-5 text-body-lg",
      },
      iconOnly: { true: "px-0", false: "" },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [
      { iconOnly: true, size: "sm", class: "w-8" },
      { iconOnly: true, size: "md", class: "w-10" },
      { iconOnly: true, size: "lg", class: "w-12" },
    ],
    defaultVariants: { variant: "secondary", size: "md", iconOnly: false, block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Lucide icon (16px inline). */
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, iconOnly, block, icon, iconRight, children, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, iconOnly, block }), className)} {...props}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
});

/** Anchor styled as a button, for navigation actions. */
export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
}

export function LinkButton({ className, variant, size, iconOnly, block, icon, children, ...props }: LinkButtonProps) {
  return (
    <a className={cn(buttonVariants({ variant, size, iconOnly, block }), "no-underline", className)} {...props}>
      {icon}
      {children}
    </a>
  );
}
