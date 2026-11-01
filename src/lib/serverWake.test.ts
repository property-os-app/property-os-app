import { describe, expect, it } from "vitest";
import { canRetryWaking, WAKE_LIMIT_MS, wakeDelay, wakingKind } from "@/lib/serverWake";

describe("wakingKind: is this the host waking the server?", () => {
  it("502, 503 and 504 are the host, whatever the body", () => {
    expect(wakingKind(502, "text/html")).toBe("gateway");
    expect(wakingKind(503, null)).toBe("gateway");
    expect(wakingKind(504, "application/json; charset=utf-8")).toBe("gateway");
  });

  it("an HTML page is the host's waking page, even with 200", () => {
    expect(wakingKind(200, "text/html; charset=utf-8")).toBe("html");
    expect(wakingKind(404, "TEXT/HTML")).toBe("html");
  });

  it("our own answers are not waking: JSON, PDF, 204, and every normal error", () => {
    expect(wakingKind(200, "application/json; charset=utf-8")).toBeNull();
    expect(wakingKind(200, "application/pdf")).toBeNull();
    expect(wakingKind(204, null)).toBeNull();
    for (const status of [400, 401, 403, 404, 409, 500]) expect(wakingKind(status, "application/json")).toBeNull();
  });
});

describe("canRetryWaking", () => {
  it("GET retries every waking failure, network errors included", () => {
    expect(canRetryWaking("GET", "network")).toBe(true);
    expect(canRetryWaking("GET", "gateway", 504)).toBe(true);
    expect(canRetryWaking("GET", "html", 200)).toBe(true);
  });

  it("writes retry only when the request never reached the API (502, 503, HTML page)", () => {
    expect(canRetryWaking("POST", "gateway", 502)).toBe(true);
    expect(canRetryWaking("PATCH", "gateway", 503)).toBe(true);
    expect(canRetryWaking("DELETE", "html", 200)).toBe(true);
    expect(canRetryWaking("POST", "gateway", 504)).toBe(false);
    expect(canRetryWaking("POST", "network")).toBe(false);
  });
});

describe("wakeDelay", () => {
  it("1s, 2s, 4s, then every 5s, about 20 tries in 90 seconds", () => {
    expect([0, 1, 2, 3, 10].map(wakeDelay)).toEqual([1000, 2000, 4000, 5000, 5000]);
    let total = 0;
    let tries = 0;
    while (total + wakeDelay(tries) <= WAKE_LIMIT_MS) total += wakeDelay(tries++);
    expect(tries).toBeGreaterThan(15);
  });
});
