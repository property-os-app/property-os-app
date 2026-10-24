import { describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/clipboard";

// Node has no document, so these cover the Clipboard API path and "never throws"; the http fallback is checked by hand on a phone.
describe("copyText", () => {
  it("uses the Clipboard API on a secure page", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("555-123-4567")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("555-123-4567");
    vi.unstubAllGlobals();
  });

  it("false (no throw) when the Clipboard API rejects and there is no fallback", async () => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await expect(copyText("x")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it("false (no throw) on plain http without a clipboard or document", async () => {
    vi.stubGlobal("isSecureContext", false);
    vi.stubGlobal("navigator", {});
    await expect(copyText("x")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it("skips the Clipboard API on an insecure page even if it exists", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("isSecureContext", false);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("x")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
