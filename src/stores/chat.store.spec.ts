import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "./chat.store";

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("conversation management", () => {
  it("starts with a single mock conversation", () => {
    const chat = useChatStore();
    expect(chat.conversations).toHaveLength(1);
    expect(chat.provider).toBe("mock");
  });

  it("creates a new conversation and makes it active", () => {
    const chat = useChatStore();
    const firstId = chat.activeConversationId;
    chat.createNewConversation();
    expect(chat.conversations).toHaveLength(2);
    expect(chat.activeConversationId).not.toBe(firstId);
    expect(chat.activeConversation?.id).toBe(chat.activeConversationId);
  });

  it("switches between conversations", () => {
    const chat = useChatStore();
    const firstId = chat.activeConversationId;
    chat.createNewConversation();
    const secondId = chat.activeConversationId;

    chat.switchConversation(firstId);
    expect(chat.activeConversationId).toBe(firstId);

    // switching to an unknown id is a no-op
    chat.switchConversation("does-not-exist");
    expect(chat.activeConversationId).toBe(firstId);

    chat.switchConversation(secondId);
    expect(chat.activeConversationId).toBe(secondId);
  });

  it("falls back to another conversation when the active one is deleted", () => {
    const chat = useChatStore();
    const firstId = chat.activeConversationId;
    chat.createNewConversation();

    chat.deleteConversation(firstId);
    expect(chat.conversations.some((c) => c.id === firstId)).toBe(false);
    expect(chat.activeConversationId).not.toBe(firstId);
  });

  it("creates a fresh conversation when the last one is deleted", () => {
    const chat = useChatStore();
    const onlyId = chat.activeConversationId;

    chat.deleteConversation(onlyId);
    expect(chat.conversations).toHaveLength(1);
    expect(chat.activeConversationId).toBe(chat.conversations[0]?.id);
  });

  it("renames a conversation, falling back to a default title when blank", () => {
    const chat = useChatStore();
    const id = chat.activeConversationId;

    chat.renameConversation(id, "  My chat  ");
    expect(chat.activeConversation?.title).toBe("My chat");

    chat.renameConversation(id, "   ");
    expect(chat.activeConversation?.title).toBe("未命名對話");
  });

  it("clears messages and resets the title on resetConversation", async () => {
    const chat = useChatStore();
    vi.useFakeTimers();
    const sendPromise = chat.sendUserText("哈囉");
    await sendPromise;
    await vi.advanceTimersByTimeAsync(5000);
    expect(chat.messages.length).toBeGreaterThan(0);

    chat.resetConversation();
    expect(chat.messages).toHaveLength(0);
    expect(chat.activeConversation?.title).toBe("新對話");
  });
});

describe("sendUserText with the mock provider", () => {
  it("streams a full assistant reply and finalizes the message", async () => {
    vi.useFakeTimers();
    const chat = useChatStore();

    const sendPromise = chat.sendUserText("哈囉");
    await sendPromise;
    // drain the 30ms-per-token display queue
    await vi.advanceTimersByTimeAsync(5000);

    expect(chat.sending).toBe(false);
    expect(chat.messages).toHaveLength(2);
    const assistantMessage = chat.messages[1];
    expect(assistantMessage?.role).toBe("assistant");
    expect(assistantMessage?.isStreaming).toBe(false);
    expect(assistantMessage?.content).toContain("哈囉");
    expect(assistantMessage?.tokenCount).toBeGreaterThan(0);
  });

  it("ignores blank input and does not send while already sending", async () => {
    vi.useFakeTimers();
    const chat = useChatStore();

    await chat.sendUserText("   ");
    expect(chat.messages).toHaveLength(0);

    const first = chat.sendUserText("第一句");
    const second = chat.sendUserText("第二句");
    await Promise.all([first, second]);
    await vi.advanceTimersByTimeAsync(5000);

    // the second call was dropped because `sending` was already true
    const userMessages = chat.messages.filter((m) => m.role === "user");
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0]?.content).toBe("第一句");
  });
});
