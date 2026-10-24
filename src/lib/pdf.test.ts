import { describe, expect, it } from "vitest";
import { filenameFromDisposition } from "@/lib/pdf";

describe("filenameFromDisposition", () => {
  it("reads a quoted filename", () => {
    expect(filenameFromDisposition('attachment; filename="LSE-2026-001.pdf"')).toBe("LSE-2026-001.pdf");
    expect(filenameFromDisposition('inline; filename="standard-lease-12-month-v2-sample.pdf"')).toBe("standard-lease-12-month-v2-sample.pdf");
  });

  it("reads a bare filename", () => {
    expect(filenameFromDisposition("attachment; filename=LSE-2026-001.pdf")).toBe("LSE-2026-001.pdf");
  });

  it("prefers filename* and decodes it", () => {
    expect(filenameFromDisposition("attachment; filename=\"a.pdf\"; filename*=UTF-8''Lease%20%E2%80%93%201.pdf")).toBe("Lease – 1.pdf");
  });

  it("falls back to filename when filename* has a bad escape", () => {
    expect(filenameFromDisposition("attachment; filename*=UTF-8''bad%E0.pdf; filename=\"ok.pdf\"")).toBe("ok.pdf");
  });

  it("returns null without a header or a name", () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition("inline")).toBeNull();
    expect(filenameFromDisposition('attachment; filename=""')).toBeNull();
  });
});
