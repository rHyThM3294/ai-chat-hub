import type {ChatMessage, ChatSendInput, ChatSendResult} from '../types/chat';
export interface ChatStreamHandlers{
  onToken:(token:string) => void;
  onDone?:() => void;
  onAbort?:() => void;
  signal?:AbortSignal;
}
export interface ChatProvider{
  id:string;
  displayName:string;
  send(input:ChatSendInput, history: ChatMessage[]):Promise<ChatSendResult>;
  stream?:(
    input:ChatSendInput,
    history:ChatMessage[],
    handlers:ChatStreamHandlers
  ) => Promise<void>;
}