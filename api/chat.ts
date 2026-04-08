type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };
export const config = {
  api: {
    bodyParser: true,
  },
};
export default async function handler(req: any, res: any){
  try{
    if(req.method !== "POST"){
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if(!apiKey){
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body?.messages as ChatMessage[] | undefined;
    const model = body?.model || "gpt-4o-mini";
    const stream = Boolean(body?.stream);
    if(!messages || !Array.isArray(messages) || messages.length === 0){
      return res.status(400).json({ error: "messages is required" });
    }
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    if(!stream){
      const resp = await client.responses.create({
        model,
        input: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      const assistantText = (resp as any).output_text ?? "";
      return res.status(200).json({ assistantText });
    }
    res.writeHead(200,{
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const responseStream = await client.responses.create({
      model,
      stream: true,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    for await (const event of responseStream){
      if(event.type === "response.output_text.delta"){
        const token = event.delta ?? "";
        if(token){
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      }
      if(event.type === "response.completed"){
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }catch (err: any){
    console.error("api/chat error:", err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: err?.message || err?.error?.message || "Unknown server error",
      });
    }
    res.write(
      `data: ${JSON.stringify({
        error: err?.message || err?.error?.message || "Unknown server error",
      })}\n\n`
    );
    res.end();
  }
}