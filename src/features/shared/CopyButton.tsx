import { Copy } from "lucide-react";
import { Button } from "@/components/atoms";
import { copyWithToast } from "@/features/shared/copyToast";

/** Icon-only "Copy {what}" button (32px, 44px on phones) with the copy toast. For an IconTile's action slot. */
export function CopyButton({ text, what }: { text: string; what: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      aria-label={`Copy ${what}`}
      title={`Copy ${what}`}
      onClick={(e) => void copyWithToast(text, what, e.currentTarget)}
      className="text-text-muted hover:text-text-primary max-md:size-11"
    >
      <Copy size={16} strokeWidth={1.5} aria-hidden />
    </Button>
  );
}
