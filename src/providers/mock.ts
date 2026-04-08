import type { ChatProvider } from "./base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

function sleep(ms: number){
  return new Promise((r) => setTimeout(r, ms));
}

export const mockProvider: ChatProvider = {
  id: "mock",
  displayName: "Mock Bot",

  async send(input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult>{
    await sleep(400);
    const lastUser = input.userText.trim();
    const turns = history.filter((m) => m.role !== "system").length;
    return {
      assistantText:
        `(Mock 回覆)\n你說的是：「${lastUser}」。\n目前對話訊息數：${turns}。\n` +
        `這是一段用來測試打字效果與停止生成的較長文字。` +
        `如果你現在看到訊息是一個字一個字慢慢出現，就表示 stream 有正常運作。` +
        `如果你在生成途中按下停止，理論上這段話會停在半路，不會完整輸出。`,
    };
  },

  async stream(input: ChatSendInput, history: ChatMessage[], handlers){
    const lastUser = input.userText.trim();
    const turns = history.filter((m) => m.role !== "system").length;
    const fullText =
      `(Mock 回覆)\n你說的是：「${lastUser}」。\n目前對話訊息數：${turns}。\n` +
      `這是一段用來測試打字效果與停止生成的較長文字。` +
      `如果你現在看到訊息是一個字一個字慢慢出現，就表示 stream 有正常運作。` +
      `如果你在生成途中按下停止，理論上這段話會停在半路，不會完整輸出。`;

    let index = 0;

    while (index < fullText.length) {
      if (handlers.signal?.aborted) {
        handlers.onAbort?.();
        throw new DOMException("Aborted", "AbortError");
      }

      const token = fullText.charAt(index);
      handlers.onToken(token);
      index += 1;

      await sleep(80);
    }

    handlers.onDone?.();
  },
};