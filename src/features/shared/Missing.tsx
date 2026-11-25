import { cn } from "@/lib/cn";

function Missing({ text, className }: { text: string; className?: string }) {
  return <span className={cn("text-text-muted", className)}>{text}</span>;
}

/** "Not set": a unit's rent or floor area that is null. A rent of $0.00 is a real value and never shows this. */
export const NotSet = () => <Missing text="Not set" />;

/** "Not provided": a tenant's missing email or phone. `what` names it where there is no label: "Email not provided". */
export const NotProvided = ({ what }: { what?: "Email" | "Phone" }) => <Missing text={what ? `${what} not provided` : "Not provided"} />;
