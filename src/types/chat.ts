export type ProviderId = "mock" | "openai" | "groq" | "gemini" | "perplexity";
export type Role = "user" | "assistant" | "system";
export interface ChatMessage{
  id:string;
  role:Role;
  content:string;
  createdAt:number;
  tokenCount?:number;
  isStreaming?:boolean;
}
export interface ChatConversation{
  id:string;
  title:string;
  provider:ProviderId;
  userText:string;
}
export interface ChatSendInput{
  conversationId:string;
  provider:ProviderId;
  userText:string;
}
export interface ChatSendResult{
  assistantText:string;
}
export function uid(prefix = "m"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}