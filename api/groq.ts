type Role = "user" | "assistant" | "system";
type ChatMessage = { role:Role; content:string };
export default async function handler(req: any, res: any){
    try{
        if(req.method !== "POST"){
            return res.status(405).json({ error:"Method Not Allowed" });
        }
        const apiKey = process.env.GROQ_API_KEY;
        if(!apiKey){
            return res.status(500).json({ error:"Missing GROQ_API_KEY" });
        }
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const messages = body?.messages as ChatMessage[] | undefined;
        const model = body?.model || "llama-3.1-8b-instant";
        if(!messages || !Array.isArray(messages) || messages.length === 0){
            return res.status(400).json({ error:"messages is required" });
        }
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
            method:"POST",
            headers:{
                "Authorization" `Bearer ${apiKey}`,
                "Content-Type":"application/json",
            },
            body:JSON.stringify({
                model,
                messages,
                temperature:0.7,
            }),
        });
        const data = await r.json();
        if(!r.ok){
            return res.status(r.status).json({
                error: data?.error?.message || JSON.stringify(data),
            });
        }
        const assistantText = data?.choices?.[0]?.message?.content ?? "";
        return res.status(200).json({ assistantText });
    }catch(err:any){
        console.error("api/groq error:", err);
        return res.status(500).json({ error: err?.message || "Unknown server error" });
    }
}