import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

export interface ChatProvider {
  id: string;
  displayName: string;
  send(input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult>;
}