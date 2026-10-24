import type { MouseEvent, SyntheticEvent } from "react";
import { Copy } from "lucide-react";
import { Button, Dash } from "@/components/atoms";
import { toast } from "@/components/molecules";
import { cn } from "@/lib/cn";
import { copyText } from "@/lib/clipboard";
import { mailtoHref, telHref } from "@/lib/contact";
import { linkFocus } from "@/features/shared/linkClass";

export interface ContactLinkProps {
  kind: "phone" | "email";
  value: string | null | undefined;
  /** Wrap a long value onto more lines (drawer details) instead of cutting it off with an ellipsis. */
  wrap?: boolean;
  className?: string;
}

const LABELS = { phone: "phone number", email: "email" } as const;

/** Keeps a tap or Enter on the link / copy button from reaching a clickable card or table row around it. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * A phone (tel:) or email (mailto:) link that opens the user's own phone or email app, and a copy button next to it
 * ("Phone number copied" toast; works on plain http too, see copyText). Neither opens the card or row it sits in;
 * `pointer-events-auto relative` lets it be tapped inside a ListCard. Text color and size come from the parent.
 * Dash when empty; plain text when a phone has no digits.
 */
export function ContactLink({ kind, value, wrap, className }: ContactLinkProps) {
  const text = value?.trim() ?? "";
  if (!text) return <Dash />;
  const href = kind === "phone" ? telHref(text) : mailtoHref({ to: text });
  const label = LABELS[kind];

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    const ok = await copyText(text, e.currentTarget);
    if (ok) toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} copied`);
    else toast.info("Couldn't copy", `Press and hold the ${label} to copy it.`);
  };

  return (
    <span className={cn("pointer-events-auto relative inline-flex min-w-0 max-w-full items-center gap-1 align-middle", className)} onClick={stop} onKeyDown={stop}>
      {href ? (
        <a
          href={href}
          title={text}
          className={cn("min-w-0 underline decoration-border-strong underline-offset-2 hover:text-text-primary hover:decoration-current", wrap ? "break-all" : "truncate", linkFocus)}
        >
          {text}
        </a>
      ) : (
        <span className={cn("min-w-0", wrap ? "break-all" : "truncate")}>{text}</span>
      )}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        onClick={(e) => void copy(e)}
        // 28px to sit next to a line of text; after: grows the tap area to 44×44.
        className="relative size-7 shrink-0 text-text-muted after:absolute after:-inset-2 hover:text-text-primary"
      >
        <Copy size={14} strokeWidth={1.5} />
      </Button>
    </span>
  );
}
