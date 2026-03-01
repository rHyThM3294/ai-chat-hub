import{ OpenAI } from "openai" | "system";
type ChatMessage = {
    role: Role;
    content:string;
};
type ChatRequest = {
    model?: string;
    messages:chatMessage[];
};
type ChatResponse = {
    assistantText:string;
};
function jsonError(status:number,message: string) {
    return new Response(JSON.stringify({ error: message }),{
        status,
        headers:{ "content-type": "application/json;charset=utf-8" },
    });
}
export defult{
    async fetch(request:Request){
        if(request.method !== "POST"){
            return jsonError(405,"Method Not Allowed");
        }
        const apiKey = process.env.OPENAI_API_KEY;
        if(!apiKey) return jsonError(500,"Missing OPENAI_API_KEY");
        let body:ChatRequest;
        try{
            body = (await request.json()) as ChatRequset;
        }catch{
            return jsonError(400, "Invalid JSON body");
        }
        if(!body?.messages?.length){
            return jsonError(400, "messages is required");
        }
        const model = body.model || "gpt-4o-mini";
        const client = new OpenAI({ apiKey });
        const resp = await client.responses.create({
            model,
            input:body.messages.map((m) => ({
                role: m.role,
                content:m.content,
            })),
        });
        const assistantText = (resp as any).output_text ?? "";
        const out: ChatResponse = { assistantText };
        return new Response(JSON.stringify(out),{
            status:200,
            headers:{ "content-type": "application/json; charset=utf-8" },
        });
    },
};