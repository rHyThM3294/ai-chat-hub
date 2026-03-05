export type ProviderId = "mock" | "openai" | "gemini" | "perplexity" | "groq";

export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface ChatSendInput {
  conversationId: string;
  provider: ProviderId;
  userText: string;
}

export interface ChatSendResult {
  assistantText: string;
}

export interface ChatProvider {
  key: ProviderId;
  name: string;
  send: (
    input: ChatSendInput,
    history: ChatMessage[]
  ) => Promise<ChatSendResult>;
}

export function uid(prefix = "m") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}