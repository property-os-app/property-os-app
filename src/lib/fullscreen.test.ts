import { describe, expect, it, vi } from "vitest";
import { enterBrowserFullscreen, exitBrowserFullscreen, leftBrowserFullscreen, type FullscreenDoc } from "@/lib/fullscreen";

const doc = (over: Partial<FullscreenDoc> = {}): FullscreenDoc => ({ fullscreenElement: null, fullscreenEnabled: true, exitFullscreen: vi.fn(() => Promise.resolve()), ...over });
const el = {} as Element;

describe("enterBrowserFullscreen", () => {
  it("is 'browser' when the request succeeds (navigation UI hidden)", async () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    await expect(enterBrowserFullscreen({ requestFullscreen }, doc())).resolves.toBe("browser");
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: "hide" });
  });

  it("is 'window' when the browser refuses", async () => {
    const requestFullscreen = vi.fn(() => Promise.reject(new TypeError("Permissions check failed")));
    await expect(enterBrowserFullscreen({ requestFullscreen }, doc())).resolves.toBe("window");
  });

  it("is 'window' without support (no API, or disabled) and doesn't call it", async () => {
    await expect(enterBrowserFullscreen({}, doc())).resolves.toBe("window");
    const requestFullscreen = vi.fn(() => Promise.resolve());
    await expect(enterBrowserFullscreen({ requestFullscreen }, doc({ fullscreenEnabled: false }))).resolves.toBe("window");
    await expect(enterBrowserFullscreen({ requestFullscreen }, doc({ fullscreenEnabled: undefined }))).resolves.toBe("window");
    expect(requestFullscreen).not.toHaveBeenCalled();
  });
});

describe("exitBrowserFullscreen", () => {
  it("exits only when something is in full screen", async () => {
    const off = doc();
    await exitBrowserFullscreen(off);
    expect(off.exitFullscreen).not.toHaveBeenCalled();
    const on = doc({ fullscreenElement: el });
    await exitBrowserFullscreen(on);
    expect(on.exitFullscreen).toHaveBeenCalledOnce();
  });

  it("never throws (exit rejected, or no API)", async () => {
    await expect(exitBrowserFullscreen(doc({ fullscreenElement: el, exitFullscreen: () => Promise.reject(new Error("not in full screen")) }))).resolves.toBeUndefined();
    await expect(exitBrowserFullscreen(doc({ fullscreenElement: el, exitFullscreen: undefined }))).resolves.toBeUndefined();
  });
});

describe("leftBrowserFullscreen", () => {
  it("is true only when we were in browser full screen and the browser left it", () => {
    expect(leftBrowserFullscreen("browser", doc())).toBe(true);
    expect(leftBrowserFullscreen("browser", doc({ fullscreenElement: el }))).toBe(false);
    // In-app only: a fullscreenchange elsewhere doesn't close our layer.
    expect(leftBrowserFullscreen("window", doc())).toBe(false);
    expect(leftBrowserFullscreen(null, doc())).toBe(false);
  });
});
