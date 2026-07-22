import { describe, expect, it } from "vitest";
import { estimateRawBytesFromDataUrl } from "./imageSize";

describe("estimateRawBytesFromDataUrl", () => {
  it("estimates the decoded byte length from a base64 data URL", () => {
    // "hello" (5 bytes) base64-encodes to "aGVsbG8=" (1 padding char)
    const dataUrl = "data:text/plain;base64,aGVsbG8=";
    expect(estimateRawBytesFromDataUrl(dataUrl)).toBe(5);
  });

  it("handles base64 with no padding", () => {
    // "abcd" (4 bytes) base64-encodes to "YWJjZA==" -- use a 3-byte example instead ("abc" -> "YWJj", no padding)
    const dataUrl = "data:text/plain;base64,YWJj";
    expect(estimateRawBytesFromDataUrl(dataUrl)).toBe(3);
  });

  it("handles a raw base64 string without a data URL prefix", () => {
    expect(estimateRawBytesFromDataUrl("aGVsbG8=")).toBe(5);
  });

  it("returns 0 for an empty string", () => {
    expect(estimateRawBytesFromDataUrl("")).toBe(0);
  });
});
