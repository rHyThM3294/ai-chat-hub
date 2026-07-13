import { describe, expect, it } from "vitest";
import { mockProvider } from "./mock";
import type { ChatMessage, ChatSendInput } from "@/types/chat";

const input: ChatSendInput = {
  conversationId: "c1",
  provider: "mock",
  userText: "哈囉",
};

describe("mockProvider.send", () => {
  it("echoes the user text and the running message count", async () => {
    const history: ChatMessage[] = [{ id: "u1", role: "user", content: "哈囉", createdAt: 0 }];
    const result = await mockProvider.send(input, history);
    expect(result.assistantText).toContain("哈囉");
    expect(result.assistantText).toContain("目前對話訊息數：1");
  });

  it("excludes system messages from the turn count", async () => {
    const history: ChatMessage[] = [
      { id: "s1", role: "system", content: "system prompt", createdAt: 0 },
      { id: "u1", role: "user", content: "哈囉", createdAt: 0 },
    ];
    const result = await mockProvider.send(input, history);
    expect(result.assistantText).toContain("目前對話訊息數：1");
  });
});

describe("mockProvider.stream", () => {
  it("emits one token per character then calls onDone", async () => {
    const tokens: string[] = [];
    let done = false;
    await mockProvider.stream?.(input, [], {
      onToken: (token) => tokens.push(token),
      onDone: () => {
        done = true;
      },
    });
    expect(tokens.join("")).toContain("哈囉");
    expect(done).toBe(true);
  });

  it("aborts and calls onAbort when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    let aborted = false;

    await expect(
      mockProvider.stream?.(input, [], {
        signal: controller.signal,
        onToken: () => {},
        onAbort: () => {
          aborted = true;
        },
      })
    ).rejects.toThrow("Aborted");
    expect(aborted).toBe(true);
  });
});
