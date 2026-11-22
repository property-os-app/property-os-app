import { describe, expect, it } from "vitest";
import { acceptOf, checkFile, DOCUMENT_RULE, formatFileSize, PDF_RULE, PHOTO_RULE } from "@/lib/files";

const MB = 1024 * 1024;
const file = (name: string, size: number, type: string) => ({ name, size, type });

describe("checkFile", () => {
  it("allows exactly 20 MB and refuses one byte more", () => {
    expect(checkFile(file("a.pdf", 20 * MB, "application/pdf"), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("a.pdf", 20 * MB + 1, "application/pdf"), DOCUMENT_RULE)).toBe("This file is too large (20 MB). The limit is 20 MB.");
  });

  it("refuses empty files and wrong types", () => {
    expect(checkFile(file("a.pdf", 0, "application/pdf"), DOCUMENT_RULE)).toBe("This file is empty.");
    expect(checkFile(file("a.docx", 10, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), DOCUMENT_RULE)).toBe(
      "This file type isn't allowed. Choose a PDF, JPEG or PNG file.",
    );
    expect(checkFile(file("a.webp", 10, "image/webp"), DOCUMENT_RULE)).not.toBeNull();
  });

  it("uses the extension when the browser gives no type", () => {
    expect(checkFile(file("Scan.JPG", 10, ""), DOCUMENT_RULE)).toBeNull();
    expect(checkFile(file("scan", 10, ""), DOCUMENT_RULE)).not.toBeNull();
  });

  it("photo: JPEG, PNG or WebP up to 5 MB", () => {
    expect(checkFile(file("p.webp", 5 * MB, "image/webp"), PHOTO_RULE)).toBeNull();
    expect(checkFile(file("p.png", 5 * MB + 1, "image/png"), PHOTO_RULE)).toBe("This file is too large (5.0 MB). The limit is 5 MB.");
    expect(checkFile(file("p.pdf", 10, "application/pdf"), PHOTO_RULE)).toBe("This file type isn't allowed. Choose a JPEG, PNG or WebP file.");
  });

  it("signed lease: PDF only", () => {
    expect(checkFile(file("lease.pdf", 10, "application/pdf"), PDF_RULE)).toBeNull();
    expect(checkFile(file("lease.png", 10, "image/png"), PDF_RULE)).toBe("This file type isn't allowed. Choose a PDF file.");
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
  it("lists MIME types and extensions", () => {
    expect(acceptOf(PDF_RULE)).toBe("application/pdf,.pdf");
  });
});
