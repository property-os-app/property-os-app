import { describe, expect, it } from "vitest";
import { canEscapeClose } from "./escapeClose";

const esc = { key: "Escape", repeat: false, isComposing: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
const body = { tagName: "BODY", isContentEditable: false };
const page = (activeElement: Parameters<typeof canEscapeClose>[1]["activeElement"] = body, layerOpen = false) => ({
  activeElement,
  querySelector: () => (layerOpen ? {} : null),
});

describe("canEscapeClose", () => {
  it("closes on a plain Esc", () => {
    expect(canEscapeClose(esc, page())).toBe(true);
  });

  it("leaves Esc to an open modal, drawer or menu", () => {
    expect(canEscapeClose(esc, page(body, true))).toBe(false);
  });

  it("ignores other keys, a held key and modifiers", () => {
    expect(canEscapeClose({ ...esc, key: "Enter" }, page())).toBe(false);
    expect(canEscapeClose({ ...esc, repeat: true }, page())).toBe(false);
    expect(canEscapeClose({ ...esc, shiftKey: true }, page())).toBe(false);
  });

  it("leaves Esc to text fields and selects", () => {
    for (const tagName of ["TEXTAREA", "SELECT"]) expect(canEscapeClose(esc, page({ tagName, isContentEditable: false }))).toBe(false);
    expect(canEscapeClose(esc, page({ tagName: "INPUT", isContentEditable: false, type: "search" }))).toBe(false);
    expect(canEscapeClose(esc, page({ tagName: "DIV", isContentEditable: true }))).toBe(false);
  });

  it("still closes from a button or checkbox", () => {
    expect(canEscapeClose(esc, page({ tagName: "BUTTON", isContentEditable: false }))).toBe(true);
    expect(canEscapeClose(esc, page({ tagName: "INPUT", isContentEditable: false, type: "checkbox" }))).toBe(true);
  });
});
