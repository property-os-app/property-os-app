import { describe, expect, it } from "vitest";
import { canViewInBrowser, fileKind, pickedFileKind } from "@/features/documents/fileKind";
import { DOCUMENT_RULE } from "@/lib/files";

const ext = (e: string) => Object.entries(DOCUMENT_RULE.types).find(([, exts]) => exts.includes(e))![0];

describe("fileKind", () => {
  it("groups every document type", () => {
    const kinds = Object.fromEntries(Object.entries(DOCUMENT_RULE.types).map(([mime, exts]) => [exts[0], fileKind(mime)]));
    expect(kinds).toEqual({
      pdf: "pdf",
      jpg: "image",
      png: "image",
      webp: "image",
      gif: "image",
      heic: "image",
      heif: "image",
      doc: "word",
      docx: "word",
      xls: "spreadsheet",
      xlsx: "spreadsheet",
      odt: "word",
      ods: "spreadsheet",
      csv: "spreadsheet",
      txt: "other",
      rtf: "other",
    });
  });

  it("an unknown type is a plain file", () => {
    expect(fileKind("application/octet-stream")).toBe("other");
    expect(fileKind("")).toBe("other");
  });
});

describe("pickedFileKind", () => {
  it("goes by the extension, whatever the browser's type", () => {
    expect(pickedFileKind({ name: "Rent.CSV", type: "" })).toBe("spreadsheet");
    expect(pickedFileKind({ name: "IMG_1.HEIC", type: "application/octet-stream" })).toBe("image");
    expect(pickedFileKind({ name: "notes.txt", type: "text/plain" })).toBe("other");
  });

  it("uses the type without a listed extension", () => {
    expect(pickedFileKind({ name: "scan.jfif", type: "image/jpeg" })).toBe("image");
    expect(pickedFileKind({ name: "scan", type: "" })).toBe("other");
  });
});

describe("canViewInBrowser", () => {
  it("only PDF, JPEG, PNG, WebP and GIF", () => {
    expect(Object.keys(DOCUMENT_RULE.types).filter(canViewInBrowser)).toEqual(["pdf", "jpg", "png", "webp", "gif"].map(ext));
    expect(canViewInBrowser("image/heic")).toBe(false);
    expect(canViewInBrowser("image/svg+xml")).toBe(false);
  });
});
