/** Checks a picked file in the browser before it is uploaded (the backend checks the real content again), and file sizes for display. */

/** What a field accepts: the allowed types (MIME and extension), the inclusive byte limit and the words for messages. */
export interface FileRule {
  /** MIME type -> extensions (lowercase, without the dot). */
  types: Record<string, string[]>;
  maxBytes: number;
  /** "PDF, JPEG or PNG" */
  typesText: string;
  /** "20 MB" */
  maxText: string;
}

const MB = 1024 * 1024;

/** Documents on leases, tenants, units and properties: PDF, JPEG or PNG, max 20 MB (API.md, File uploads). */
export const DOCUMENT_RULE: FileRule = {
  types: { "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"] },
  maxBytes: 20 * MB,
  typesText: "PDF, JPEG or PNG",
  maxText: "20 MB",
};

/** The property cover photo: JPEG, PNG or WebP, max 5 MB. */
export const PHOTO_RULE: FileRule = {
  types: { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] },
  maxBytes: 5 * MB,
  typesText: "JPEG, PNG or WebP",
  maxText: "5 MB",
};

/** The `accept` attribute for a file input: every MIME type and extension of the rule. */
export function acceptOf(rule: FileRule): string {
  const parts = Object.entries(rule.types).flatMap(([mime, exts]) => [mime, ...exts.map((e) => `.${e}`)]);
  return parts.join(",");
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * null when the file may be sent, else a message for the form. The browser's type is used when it has one; without it
 * (some systems leave it empty) the extension decides. Empty files and files over the limit (inclusive) are refused.
 */
export function checkFile(file: Pick<File, "name" | "size" | "type">, rule: FileRule): string | null {
  const allowed = file.type ? file.type in rule.types : Object.values(rule.types).some((exts) => exts.includes(extensionOf(file.name)));
  if (!allowed) return `This file type isn't allowed. Choose a ${rule.typesText} file.`;
  if (file.size === 0) return "This file is empty.";
  if (file.size > rule.maxBytes) return `This file is too large (${formatFileSize(file.size)}). The limit is ${rule.maxText}.`;
  return null;
}

/** "980 B", "482 KB", "2.3 MB" (1024-based, like the limits). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / MB;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
