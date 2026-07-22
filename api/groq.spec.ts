import { beforeEach, describe, expect, it, vi } from "vitest";
import handler from "./groq.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    writeHead() {
      return this;
    },
    flushHeaders() {},
    write() {},
    end() {},
  };
  return res;
}

function createMockReq(ip: string) {
  return {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  };
}

describe("api/groq rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network disabled in test")));
  });

  it("returns 429 with a Retry-After header once a client exceeds the request quota", async () => {
    const ip = "203.0.113.1";
    let lastRes: ReturnType<typeof createMockRes> | undefined;
    for (let i = 0; i < 21; i++) {
      lastRes = createMockRes();
      await handler(createMockReq(ip), lastRes);
    }
    expect(lastRes?.statusCode).toBe(429);
    expect(lastRes?.headers["Retry-After"]).toBeDefined();
  });

  it("does not rate limit a different client", async () => {
    const res = createMockRes();
    await handler(createMockReq("198.51.100.9"), res);
    expect(res.statusCode).not.toBe(429);
  });
});
