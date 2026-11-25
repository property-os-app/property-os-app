/** What kind of file a document is (its icon), and whether it opens in a browser tab. */
import { DOCUMENT_RULE, extensionOf } from "@/lib/files";

export type FileKind = "pdf" | "word" | "spreadsheet" | "image" | "other";

/** How a kind is named (icon tooltip and screen readers). */
export const FILE_KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  word: "Word document",
  spreadsheet: "Spreadsheet",
  image: "Image",
  other: "File",
};

const KINDS: Record<string, FileKind> = {
  "application/pdf": "pdf",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/vnd.oasis.opendocument.text": "word",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "application/vnd.oasis.opendocument.spreadsheet": "spreadsheet",
  "text/csv": "spreadsheet",
};

/** The kind of a stored document, from its `contentType`. Text, RTF and anything unknown: "other". */
export function fileKind(contentType: string): FileKind {
  return contentType.startsWith("image/") ? "image" : (KINDS[contentType] ?? "other");
}

/** The kind of a picked file: its extension first (browsers give CSV and HEIC odd types), else the browser's type. */
export function pickedFileKind(file: Pick<File, "name" | "type">): FileKind {
  const ext = extensionOf(file.name);
  const listed = Object.entries(DOCUMENT_RULE.types).find(([, exts]) => exts.includes(ext));
  return fileKind(listed ? listed[0] : file.type);
}

const VIEWABLE: ReadonlySet<string> = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

/** true when the API opens it in a browser tab (`inline=true`); every other type (HEIC too) always downloads. */
export function canViewInBrowser(contentType: string): boolean {
  return VIEWABLE.has(contentType);
}
