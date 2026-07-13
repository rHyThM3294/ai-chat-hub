import { describe, expect, it } from "vitest";
import { estimateTokens } from "./token";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("counts each Chinese character as one token", () => {
    expect(estimateTokens("你好世界")).toBe(4);
  });

  it("counts roughly 4 non-Chinese characters as one token", () => {
    expect(estimateTokens("test")).toBe(1);
    expect(estimateTokens("hello world")).toBe(Math.ceil(11 / 4));
  });

  it("combines Chinese and non-Chinese character counts", () => {
    // 2 Chinese chars + 4 other chars ("test") => 2 + ceil(4/4)
    expect(estimateTokens("你好test")).toBe(2 + 1);
  });
});
