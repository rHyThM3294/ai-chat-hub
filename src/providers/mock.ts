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
    `目前對話訊息數：${turns}。\n` +
    `這是一段用來測試打字效果與停止生成的較長文字。` +
    `如果你現在看到訊息是一個字一個字慢慢出現，就表示 stream 有正常運作。` +
    `如果你在生成途中按下停止，理論上這段話會停在半路，不會完整輸出。`
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
      console.log('送出 token:',token)
      handlers.onToken(token);
      await sleep(28);
    }
    handlers.onDone?.();
  },
};