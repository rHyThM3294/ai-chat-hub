import type { ChatProvider } from "./base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

function sleep(ms: number){
  return new Promise((r) => setTimeout(r, ms));
}

function buildMockReply(input: ChatSendInput, history: ChatMessage[]){
  const lastUser = input.userText.trim();
  const turns = history.filter((m) => m.role !== "system").length;
  return(
    `你說的是：「${lastUser}」。\n` +
    `目前對話訊息數：${turns}。`
  );
}

export const mockProvider: ChatProvider = {
  id: "mock",
  displayName: "Mock Bot",
  async send(input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult>{
    await sleep(300);
    return{
      assistantText: buildMockReply(input, history),
    };
  },
  async stream(input: ChatSendInput, history: ChatMessage[], handlers){
    const fullText = buildMockReply(input, history);
    const tokens = Array.from(fullText);
    for(const token of tokens){
      if(handlers.signal?.aborted){
        handlers.onAbort?.();
        throw new DOMException("Aborted", "AbortError");
      }
      handlers.onToken(token);
    }
    handlers.onDone?.();
  },
};