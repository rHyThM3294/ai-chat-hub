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
    return{
      assistantText: `(Mock 回覆)你說：「${lastUser}」。目前對話訊息數：${turns}。`,
    };
  },
  async stream(input: ChatSendInput, history: ChatMessage[], handlers){
    const lastUser = input.userText.trim();
    const turns = history.filter((m) => m.role !== "system").length;
    const fullText = `(Mock 回覆)你說：「${lastUser}」。目前對話訊息數：${turns}。`;
    let index = 0;
    while(index < fullText.length){
      if(handlers.signal?.aborted){
        handlers.onAbort?.();
        throw new DOMException("Aborted", "AbortError");
      }
      const token = fullText.charAt(index);
      handlers.onToken(token);
      index += 1;
      await sleep(20);
    }
    handlers.onDone?.();
  },
};