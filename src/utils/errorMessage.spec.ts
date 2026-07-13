import { describe, expect, it } from "vitest";
import { humanizeError } from "./errorMessage";

describe("humanizeError", () => {
  it("returns a generic message for empty input", () => {
    expect(humanizeError(null)).toBe("發生未知錯誤，請稍後再試一次。");
    expect(humanizeError(undefined)).toBe("發生未知錯誤，請稍後再試一次。");
    expect(humanizeError("")).toBe("發生未知錯誤，請稍後再試一次。");
  });

  it("recognizes a missing API key", () => {
    expect(humanizeError("Groq API error (500): Missing GROQ_API_KEY")).toContain("API 金鑰");
  });

  it("recognizes an unknown provider", () => {
    expect(humanizeError("Provider not found")).toBe("找不到對應的 AI 供應商設定。");
  });

  it("recognizes network failures", () => {
    expect(humanizeError("TypeError: Failed to fetch")).toContain("網路連線異常");
  });

  it("recognizes rate limiting (429)", () => {
    expect(humanizeError("Groq API error (429): rate limited")).toContain("使用量上限");
  });

  it("recognizes auth errors (401/403)", () => {
    expect(humanizeError("Groq API error (401): unauthorized")).toContain("金鑰無效");
    expect(humanizeError("Groq API error (403): forbidden")).toContain("金鑰無效");
  });

  it("recognizes server errors (5xx)", () => {
    expect(humanizeError("Groq API error (503): upstream down")).toContain("暫時發生問題");
  });

  it("falls back to a status-code message for unrecognized status codes", () => {
    expect(humanizeError("Groq API error (404): not found")).toContain("找不到對應的 API 端點");
    expect(humanizeError("Groq API error (418): teapot")).toContain("狀態碼 418");
  });
});
