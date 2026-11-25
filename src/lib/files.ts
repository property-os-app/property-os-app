/** Checks a picked file in the browser before it is uploaded (the backend checks the real content again), and file sizes for display. */

/** What a field accepts: the allowed types (MIME and extension), the inclusive byte limit and the words for messages. */
export interface FileRule {
  /** MIME type -> extensions (lowercase, without the dot). */
  types: Record<string, string[]>;
  maxBytes: number;
  /** For "Choose a ... file.": "JPEG, PNG or WebP" */
  typesText: string;
  /** "20 MB" */
  maxText: string;
  /** The extension decides, not the browser's MIME type (Windows often gives HEIC and CSV an empty or odd one). */
  byExtension?: boolean;
}

const MB = 1024 * 1024;

/** Documents on leases, tenants, units, properties and payments, max 20 MB (API.md, File uploads: the stored content types). */
export const DOCUMENT_RULE: FileRule = {
  types: {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/gif": ["gif"],
    "image/heic": ["heic"],
    "image/heif": ["heif"],
    "application/msword": ["doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
    "application/vnd.ms-excel": ["xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
    "application/vnd.oasis.opendocument.text": ["odt"],
    "application/vnd.oasis.opendocument.spreadsheet": ["ods"],
    "text/csv": ["csv"],
    "text/plain": ["txt"],
    "application/rtf": ["rtf"],
  },
  maxBytes: 20 * MB,
  typesText: "PDF, Word, Excel, image, CSV or text",
  maxText: "20 MB",
  byExtension: true,
};

/** The hint under every document upload box. */
export const DOCUMENT_HINT = "PDF, Word, Excel, images, CSV or text, up to 20 MB";

/** The property cover photo: JPEG, PNG or WebP, max 5 MB. */
export const PHOTO_RULE: FileRule = {
  types: { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"] },
  maxBytes: 5 * MB,
  typesText: "JPEG, PNG or WebP",
  maxText: "5 MB",
};

/** The `accept` attribute for a file input: the rule's extensions, with its MIME types unless it goes by extension. */
export function acceptOf(rule: FileRule): string {
  const parts = Object.entries(rule.types).flatMap(([mime, exts]) => [...(rule.byExtension ? [] : [mime]), ...exts.map((e) => `.${e}`)]);
  return parts.join(",");
}

/** "Scan.JPG" -> "jpg"; "" without an extension. */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

function typeAllowed(file: Pick<File, "name" | "type">, rule: FileRule): boolean {
  const listed = Object.values(rule.types).some((exts) => exts.includes(extensionOf(file.name)));
  if (!rule.byExtension) return file.type ? file.type in rule.types : listed;
  // PDFs and images are recognised by their content, so one with another extension ("scan.jfif") can be sent; text can't (".log" is refused).
  return listed || (file.type in rule.types && (file.type === "application/pdf" || file.type.startsWith("image/")));
}

/**
 * null when the file may be sent, else a message for the form. Documents: a listed extension is enough, whatever the
 * browser's type. Photo: the browser's type, or the extension when it is empty. Empty files and files over the limit
 * (inclusive) are refused.
 */
export function checkFile(file: Pick<File, "name" | "size" | "type">, rule: FileRule): string | null {
  if (!typeAllowed(file, rule)) return `This file type isn't allowed. Choose a ${rule.typesText} file.`;
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
