import OpenAI from "openai";
type Role = "user" | "assistant" | "system";
type ChatMessage = { role:Role;content:string };
export defult async function handler(req:any,res:any){
    try{
        if(req.method !== "POST"){
            return res.status(405).json({ error: "Method Not Allowed" });
        }
        const apiKey = process.env.OPENAI_API_KEY;
        if(!apiKey){
            return res.status(500).json({ error:"Message OPENAI_API_KEY" });
        }
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const messages = body?.messages as ChatMessage[] | undefined;
        const model = body?.model || "gpt-4o-mini";
        if(!messages || !Array.isArray(messages) || messages.length === 0){
            return res.status(400).json({ error:"messages is required" });
        }
        const client = new OpenAI({ apiKey });
        const resp = await client.responses.create({
            model,
            input: message.map((m) => ({
                role:m.role,
                content:m.content,
            })),
        });
        const assistantText = (resp as any).output_text ?? "";
        return res.status(200).json({ assistantText });
    }catch(err:any){
        console.error("api/chat error:", err);
        const msg = 
            err?.message ||
            err?.error?.message ||
            "Unknown server error";
        return res.status(500.json({ error:msg }));
    }
}