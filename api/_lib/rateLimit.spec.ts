import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows requests under the limit and blocks once the limit is exceeded", () => {
    const key = "ip-a";
    const now = 1_000_000;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key, now).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate clients independently", () => {
    const now = 2_000_000;
    for (let i = 0; i < 20; i++) {
      checkRateLimit("ip-b", now);
    }
    expect(checkRateLimit("ip-b", now).allowed).toBe(false);
    expect(checkRateLimit("ip-c", now).allowed).toBe(true);
  });

  it("resets the window once it has elapsed", () => {
    const key = "ip-d";
    const now = 3_000_000;
    for (let i = 0; i < 20; i++) {
      checkRateLimit(key, now);
    }
    expect(checkRateLimit(key, now).allowed).toBe(false);
    expect(checkRateLimit(key, now + 60_001).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("uses the first entry in x-forwarded-for", () => {
    expect(getClientIp({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp({ "x-real-ip": "9.9.9.9" })).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' when no IP headers are present", () => {
    expect(getClientIp({})).toBe("unknown");
  });

  it("handles array-valued headers", () => {
    expect(getClientIp({ "x-forwarded-for": ["1.1.1.1", "2.2.2.2"] })).toBe("1.1.1.1");
  });
});
