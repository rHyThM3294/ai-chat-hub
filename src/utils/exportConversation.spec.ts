import { describe, expect, it } from "vitest";
import { conversationToJson, conversationToMarkdown } from "./exportConversation";
import type { ChatConversation } from "@/types/chat";

const conversation: ChatConversation = {
  id: "c1",
  title: "測試對話",
  provider: "mock",
  createdAt: new Date("2026-01-01T10:00:00").getTime(),
  updatedAt: new Date("2026-01-01T10:05:00").getTime(),
  messages: [
    {
      id: "u1",
      role: "user",
      content: "哈囉",
      createdAt: new Date("2026-01-01T10:00:00").getTime(),
    },
    {
      id: "a1",
      role: "assistant",
      content: "你好，我能幫你什麼？",
      createdAt: new Date("2026-01-01T10:00:05").getTime(),
    },
  ],
};

describe("conversationToMarkdown", () => {
  it("includes the title, provider, and every message", () => {
    const md = conversationToMarkdown(conversation);
    expect(md).toContain("# 測試對話");
    expect(md).toContain("**Provider：** mock");
    expect(md).toContain("哈囉");
    expect(md).toContain("你好，我能幫你什麼？");
    expect(md).toContain("## 你");
    expect(md).toContain("## 機器人");
  });

  it("embeds attached images as markdown image syntax", () => {
    const withImage: ChatConversation = {
      ...conversation,
      messages: [
        {
          ...conversation.messages[0]!,
          images: [{ id: "img1", name: "cat.png", dataUrl: "data:image/png;base64,AAA" }],
        },
      ],
    };
    const md = conversationToMarkdown(withImage);
    expect(md).toContain("![cat.png](data:image/png;base64,AAA)");
  });
});

describe("conversationToJson", () => {
  it("round-trips the conversation data losslessly", () => {
    const json = conversationToJson(conversation);
    expect(JSON.parse(json)).toEqual(conversation);
  });
});
