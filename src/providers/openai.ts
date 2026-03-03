import type { ChatProvider } from "./base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";
export const openaiProvider: ChatProvider = {
    id: "openai",
    displayName:"OpenAI (via Vercel)",
    async send(_input: ChatSendInput, history:ChatMessage[]):Promise<ChatSendResult>{
        const res = await fetch("/api/chat",{
            method:"POST",
            headers:{ "content-type": "application/json" },
            body:JSON.stringify({
                model: "gpt-4o-mini",
                messages: history.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            }),
        });
        if(!res.ok){
            const t = await res.text().catch(() => "");
            throw new Error(`API error (${res.status}):${t || res.statusText}`);
        }
        const data = (await res.json()) as { assistantText:string };
        return { assistantText:data.assistantText || "" };
    },
};