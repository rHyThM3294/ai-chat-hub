import type { ChatProvider } from "@/providers/base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";
export const groqProvider:ChatProvider = {
  id:"groq",
  displayName:"Groq",
  async send(_input:ChatSendInput,history:ChatMessage[]):Promise<ChatSendResult>{
    const r = await fetch("/api/groq",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        model:"llama-3.1-8b-instant",
        messages:history.map((m) => ({
          role:m.role,
          content:m.content,
        })),
      }),
    });
    if(!r.ok){
      const t  = await r.text().catch(() => "");
      throw new Error(`Groq API error (&{r.status}):${t || r.statusText}`);
    }
    const data = (await r.json()) as { assistsntText:string };
    return{assistantText: data.assistsntText || ""};
  },
  async stream(input:ChatSendInput,history:ChatMessage[], handlers){
    const r = await fetch("/api/groq",{
      method:"POST",
      headers:{ "content-type":"application/json" },
      signal:handlers.signal,
      body:JSON.stringify({
        model:"llama-3.1-8b-instant",
        conversationId:input.conversationId,
        provider:input.conversationId,
        userText:input.userText,
        messages:history.map((m) => ({
          role:m.role,
          content:m.content,
        })),
      }),
    });
    if(!r.ok){
      const t = await r.text().catch(() => "");
      throw new Error(`Groq API error(${r.status}):${t || r.statusText}`);
    }
    const reader = r.body?.getReader();
    if(!reader){
      throw new Error("No response body");
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try{
      while(true){
        if(handlers.signal?.aborted){
          handlers.onAbort?.();
          throw new DOMException("Aborted","AbortError");
        }
        const { value,done } = await reader.read();
        if(done)break;
        buffer += decoder.decode(value,{ stream:true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for(const chunk of chunks){
          const line = chunk.trim();
          if(!line.startsWith("data:"))continue;
          const raw = line.replace(/^data:\s*/,"");
          try{
            const json = JSON.parse(raw);
            if(json.token){
              handlers.onToken(json.token);
            }
            if(json.done){
              handlers.onDone?.();
              return;
            }
          }catch{
            // 忽略不完整片段
          }
        }
      }
      handlers.onDone?.();
    }finally{
      reader.releaseLock();
    }
  },
};