import { File, FileImage, FileSpreadsheet, FileText, FileType, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { FILE_KIND_LABEL, type FileKind } from "@/features/documents/fileKind";

const ICONS: Record<FileKind, LucideIcon> = { pdf: FileText, word: FileType, spreadsheet: FileSpreadsheet, image: FileImage, other: File };

/** A file's icon by kind in a soft square, its kind as the tooltip and for screen readers. */
export function FileKindIcon({ kind, className }: { kind: FileKind; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <span
      role="img"
      aria-label={FILE_KIND_LABEL[kind]}
      title={FILE_KIND_LABEL[kind]}
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-3 text-text-muted", className)}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden />
    </span>
  );
}
