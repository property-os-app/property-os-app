import { describe, expect, it } from "vitest";
import { documentForm, isFileError, nameError, photoForm } from "@/features/documents/form";

const pdf = () => new File(["%PDF-1.4"], "Signed lease.pdf", { type: "application/pdf" });

describe("documentForm", () => {
  it("sends file, category and the trimmed name", () => {
    const form = documentForm(pdf(), "SIGNED_LEASE", "  Lease 2019  ");
    expect([...form.keys()]).toEqual(["file", "category", "name"]);
    expect((form.get("file") as File).name).toBe("Signed lease.pdf");
    expect(form.get("category")).toBe("SIGNED_LEASE");
    expect(form.get("name")).toBe("Lease 2019");
  });

  it("leaves a blank name out (the backend uses the file name)", () => {
    expect([...documentForm(pdf(), "OTHER", "   ").keys()]).toEqual(["file", "category"]);
    expect([...documentForm(pdf(), "OTHER").keys()]).toEqual(["file", "category"]);
  });
});

describe("photoForm", () => {
  it("sends only the file", () => {
    expect([...photoForm(new File(["x"], "front.jpg", { type: "image/jpeg" })).keys()]).toEqual(["file"]);
  });
});

describe("isFileError", () => {
  it("400 about the file, and any 413 or 415", () => {
    expect(isFileError("file is empty", 400)).toBe(true);
    expect(isFileError("File too large", 413)).toBe(true);
    expect(isFileError("Password-protected files are not supported", 415)).toBe(true);
    expect(isFileError("category must be one of OTHER", 400)).toBe(false);
    expect(isFileError("Unit u1 not found", 404)).toBe(false);
  });
});

describe("nameError", () => {
  it("allows blank and normal names up to 200 characters", () => {
    expect(nameError("")).toBeNull();
    expect(nameError("Move-in inspection (2026)")).toBeNull();
    expect(nameError("a".repeat(200))).toBeNull();
    expect(nameError(` ${"a".repeat(200)} `)).toBeNull();
  });

  it("refuses long names, slashes and control characters", () => {
    expect(nameError("a".repeat(201))).toBe("Use at most 200 characters.");
    expect(nameError("2019/lease")).not.toBeNull();
    expect(nameError("a\\b")).not.toBeNull();
    expect(nameError("a\tb")).not.toBeNull();
  });
});
