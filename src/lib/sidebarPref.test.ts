import { describe, expect, it } from "vitest";
import { readSidebarCollapsed, SIDEBAR_COLLAPSED_KEY, writeSidebarCollapsed } from "@/lib/sidebarPref";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

const throwing = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("readSidebarCollapsed", () => {
  it("is expanded by default", () => {
    expect(readSidebarCollapsed(memoryStorage())).toBe(false);
    expect(readSidebarCollapsed(null)).toBe(false);
  });

  it("reads a saved choice; anything but '1' is expanded", () => {
    expect(readSidebarCollapsed(memoryStorage({ [SIDEBAR_COLLAPSED_KEY]: "1" }))).toBe(true);
    expect(readSidebarCollapsed(memoryStorage({ [SIDEBAR_COLLAPSED_KEY]: "0" }))).toBe(false);
    expect(readSidebarCollapsed(memoryStorage({ [SIDEBAR_COLLAPSED_KEY]: "true" }))).toBe(false);
  });

  it("is expanded when storage throws", () => {
    expect(readSidebarCollapsed(throwing)).toBe(false);
  });
});

describe("writeSidebarCollapsed", () => {
  it("saves '1' / '0' and reads back", () => {
    const s = memoryStorage();
    writeSidebarCollapsed(true, s);
    expect(s.data.get(SIDEBAR_COLLAPSED_KEY)).toBe("1");
    expect(readSidebarCollapsed(s)).toBe(true);
    writeSidebarCollapsed(false, s);
    expect(readSidebarCollapsed(s)).toBe(false);
  });

  it("ignores storage errors and missing storage", () => {
    expect(() => writeSidebarCollapsed(true, throwing)).not.toThrow();
    expect(() => writeSidebarCollapsed(true, null)).not.toThrow();
  });
});
