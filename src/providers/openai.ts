import type { ChatProvider } from "./base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";
export const openaiProvider:ChatProvider = {
    id:"openai",
    displayName:"OpenAI(via Vercel)",
    async send(_input:ChatSendInput,history: ChatMessage[]):Promise<ChatSendResult>{
        const res = await fetch("/api/chat",{
            method:"POST",
            headers:{ "content-type":"application/json" },
            body:JSON.stringify({
                model:"gpt-40-mini",
                messages:history.map((m) => ({
                    role:m.role,
                    content:m.content,
                })),
            }),
        });
        if(!res.ok){
            const t = await res.text().catch(() => "");
            throw new Error(`API error(${res.status}):${t || res.statusText}`);
        }
        const data = (await res.json()) as { assistantText: string };
        return{ assistantText:data.assistantText|| "" };
    },
    async stream(input: ChatSendInput,history:ChatMessage[],handlers){
        const res = await fetch("/api/chat",{
            method:"POST",
            headers:{ "content-type":"application/json" },
            signal:handlers.signal,
            body:JSON.stringify({
                model:"gpt-4o-mini",
                stream:"true",
                conversationId:input.conversationId,
                provider:input.provider,
                userText:input.userText,
                messages:history.map((m) => ({
                    role:m.role,
                    content:m.content,
                })),
            }),
        });
        if(!res.ok){
            const t = await res.text().catch(() => "");
            throw new Error(`API error(${res.status}):${t || res.statusText}`);
        }
        const reader = res.body?.getReader();
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
                const { value, done } = await reader.read();
                if(done)break;
                buffer += decoder.decode(value,{ stream:true});
                const chunks = buffer.split("\n\n");
                buffer = chunks.pop() || "";
                for(const chunk  of chunks){
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
                        //ignore
                    }
                }
            }
            handlers.onDone?.();
        }finally{
            reader.releaseLock();
        }
    },
};