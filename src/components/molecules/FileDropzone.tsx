import * as React from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Bar } from "@/components/atoms/Progress";

export interface DropzoneFile {
  id: string;
  name: string;
  size: string;
  /** 0 to 100 while uploading; omit when done. */
  progress?: number;
}

export interface FileDropzoneProps {
  files?: DropzoneFile[];
  onFiles: (files: FileList) => void;
  onRemove?: (id: string) => void;
  accept?: string;
  hint?: string;
  className?: string;
}

/** Dashed dropzone with a thumbnail list and per-file progress. Receipts, photos, documents. */
export function FileDropzone({ files = [], onFiles, onRemove, accept, hint = "PDF, PNG, JPG up to 20 MB", className }: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        className={cn("flex flex-col items-center gap-2 rounded-card border border-dashed bg-surface-2 p-6 text-center text-text-secondary", over ? "border-success" : "border-border-strong")}
      >
        <Upload size={24} strokeWidth={1.5} />
        <div className="text-small">
          Drop files here, or{" "}
          <button type="button" className="font-semibold text-success underline-offset-2 hover:underline" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </div>
        <div className="text-caption text-text-muted">{hint}</div>
        <input ref={inputRef} type="file" multiple accept={accept} className="sr-only" onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </div>
      {files.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 text-small">
              <span className="inline-flex size-10 items-center justify-center rounded-control border border-border-subtle bg-surface-3 text-text-muted"><FileText size={16} strokeWidth={1.5} /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-text-primary">{f.name}</div>
                {f.progress !== undefined ? <Bar value={f.progress} className="mt-1" /> : <span className="text-caption text-text-muted">{f.size}</span>}
              </div>
              {onRemove && (
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)} className="rounded p-1 text-text-muted hover:bg-surface-3 hover:text-text-primary">
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
