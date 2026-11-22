import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { fetchViewLink, openBlankTab, showInTab, type ViewTab } from "@/features/documents/view";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

const LINK = { url: "https://bucket.example/doc.pdf?response-content-disposition=inline", expiresAt: "2026-11-22T10:05:00.000Z" };

function fakeTab(): ViewTab & { close: ReturnType<typeof vi.fn<() => void>> } {
  return { opener: {}, location: { href: "about:blank" }, document: { title: "", body: { textContent: "" } }, close: vi.fn<() => void>() };
}

beforeEach(() => vi.mocked(apiFetch).mockReset());

describe("fetchViewLink", () => {
  it("asks for the inline link (inline=true) of that document", async () => {
    vi.mocked(apiFetch).mockResolvedValue(LINK);
    await expect(fetchViewLink("doc 1")).resolves.toEqual(LINK);
    expect(apiFetch).toHaveBeenCalledWith("/documents/doc%201/download", { query: { inline: true } });
  });
});

describe("openBlankTab", () => {
  it("cuts the opener and shows plain 'Opening document…' text", () => {
    const tab = fakeTab();
    expect(openBlankTab(() => tab)).toBe(tab);
    expect(tab.opener).toBeNull();
    expect(tab.document?.title).toBe("Opening document…");
    expect(tab.document?.body?.textContent).toBe("Opening document…");
  });

  it("returns null when the browser blocks the tab", () => {
    expect(openBlankTab(() => null)).toBeNull();
  });

  it("still returns the tab when its document can't be written", () => {
    const tab = fakeTab();
    Object.defineProperty(tab, "document", { get: () => { throw new Error("blocked"); } });
    expect(openBlankTab(() => tab)).toBe(tab);
    expect(tab.opener).toBeNull();
  });
});

describe("showInTab", () => {
  it("points the tab at the fresh link", async () => {
    const tab = fakeTab();
    const fetchLink = vi.fn().mockResolvedValue(LINK);
    await showInTab(tab, "d1", fetchLink);
    expect(fetchLink).toHaveBeenCalledWith("d1");
    expect(tab.location.href).toBe(LINK.url);
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("closes the tab and rethrows when the link request fails", async () => {
    const tab = fakeTab();
    const err = new Error("Document d1 not found");
    await expect(showInTab(tab, "d1", vi.fn().mockRejectedValue(err))).rejects.toBe(err);
    expect(tab.close).toHaveBeenCalledOnce();
    expect(tab.location.href).toBe("about:blank");
  });

  it("asks for a new link on every call (nothing cached)", async () => {
    const fetchLink = vi.fn().mockResolvedValue(LINK);
    await showInTab(fakeTab(), "d1", fetchLink);
    await showInTab(fakeTab(), "d1", fetchLink);
    expect(fetchLink).toHaveBeenCalledTimes(2);
  });
});
