import { describe, expect, it } from "vitest";
import { acceptOf, checkFile, DOCUMENT_RULE, formatFileSize, PHOTO_RULE } from "@/lib/files";

const MB = 1024 * 1024;
const file = (name: string, size: number, type: string) => ({ name, size, type });

describe("checkFile", () => {
  it("allows exactly 20 MB and refuses one byte more", () => {
    expect(checkFile(file("a.pdf", 20 * MB, "application/pdf"), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("a.pdf", 20 * MB + 1, "application/pdf"), DOCUMENT_RULE)).toBe("This file is too large (20 MB). The limit is 20 MB.");
  });

  it("refuses empty files and wrong types", () => {
    expect(checkFile(file("a.pdf", 0, "application/pdf"), DOCUMENT_RULE)).toBe("This file is empty.");
    const message = "This file type isn't allowed. Choose a PDF, Word, Excel, image, CSV or text file.";
    expect(checkFile(file("a.docm", 10, "application/vnd.ms-word.document.macroEnabled.12"), DOCUMENT_RULE)).toBe(message);
    expect(checkFile(file("a.html", 10, "text/html"), DOCUMENT_RULE)).toBe(message);
    expect(checkFile(file("a.svg", 10, "image/svg+xml"), DOCUMENT_RULE)).toBe(message);
    // The server needs .txt or .csv for text.
    expect(checkFile(file("a.log", 10, "text/plain"), DOCUMENT_RULE)).toBe(message);
    expect(checkFile(file("a.csv.exe", 10, "application/x-msdownload"), DOCUMENT_RULE)).toBe(message);
  });

  it("documents: a listed extension is enough, whatever the browser's type", () => {
    for (const ext of acceptOf(DOCUMENT_RULE).split(",")) {
      expect(checkFile(file(`a${ext}`, 10, ""), DOCUMENT_RULE)).toBeNull();
      expect(checkFile(file(`a${ext.toUpperCase()}`, 10, "application/octet-stream"), DOCUMENT_RULE)).toBeNull();
    }
    expect(checkFile(file("rent.csv", 10, "application/vnd.ms-excel"), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("scan", 10, ""), DOCUMENT_RULE)).not.toBeNull();
  });

  it("documents: a PDF or image type is enough without a listed extension", () => {
    expect(checkFile(file("scan.jfif", 10, "image/jpeg"), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("scan", 10, "application/pdf"), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("sheet", 10, "application/vnd.ms-excel"), DOCUMENT_RULE)).not.toBeNull();
  });

  it("photo: the browser's type decides, the extension only without one", () => {
    expect(checkFile(file("p.png", 10, "application/octet-stream"), PHOTO_RULE)).not.toBeNull();
    expect(checkFile(file("p.JPG", 10, ""), PHOTO_RULE)).toBeNull();
    expect(checkFile(file("p.heic", 10, "image/heic"), PHOTO_RULE)).not.toBeNull();
  });

  it("photo: JPEG, PNG or WebP up to 5 MB", () => {
    expect(checkFile(file("p.webp", 5 * MB, "image/webp"), PHOTO_RULE)).toBeNull();
    expect(checkFile(file("p.png", 5 * MB + 1, "image/png"), PHOTO_RULE)).toBe("This file is too large (5.0 MB). The limit is 5 MB.");
    expect(checkFile(file("p.pdf", 10, "application/pdf"), PHOTO_RULE)).toBe("This file type isn't allowed. Choose a JPEG, PNG or WebP file.");
  });
});

describe("formatFileSize", () => {
  it("shows B, KB and MB", () => {
    expect(formatFileSize(980)).toBe("980 B");
    expect(formatFileSize(482113)).toBe("471 KB");
    expect(formatFileSize(2318840)).toBe("2.2 MB");
    expect(formatFileSize(15 * MB)).toBe("15 MB");
  });
});

describe("acceptOf", () => {
  it("documents: extensions only", () => {
    expect(acceptOf(DOCUMENT_RULE)).toBe(".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.doc,.docx,.xls,.xlsx,.odt,.ods,.csv,.txt,.rtf");
  });

  it("photo: MIME types and extensions", () => {
    expect(acceptOf(PHOTO_RULE)).toBe("image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp");
  });
});
