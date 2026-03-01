import type { ChatProvider } from "./base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockProvider: ChatProvider = {
  id: "mock",
  displayName: "Mock Bot",
  async send(input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult> {
    await sleep(400);
    const lastUser = input.userText.trim();
    const turns = history.filter((m) => m.role !== "system").length;
    return {
      assistantText: `（Mock 回覆）你說：「${lastUser}」。目前對話訊息數：${turns}。`,
    };
  },
};