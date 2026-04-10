type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };

export const config = {
  api: {
    bodyParser: true,
  },
};

function transformMessages(messages: ChatMessage[]){
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export default async function handler(req: any, res: any){
  let clientClosed = false;

  try{
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body?.messages as ChatMessage[] | undefined;
    const model = body?.model || "gpt-4o-mini";
    const stream = Boolean(body?.stream);

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    if (!stream) {
      const completion = await client.chat.completions.create({
        model,
        messages: transformMessages(messages),
        temperature: 0.7,
        max_tokens: 1000,
      });

      const assistantText = completion.choices[0]?.message?.content || "";
      return res.status(200).json({ assistantText });
    }

    req.on("close", () => {
      clientClosed = true;
    });

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const streamResponse = await client.chat.completions.create({
      model,
      messages: transformMessages(messages),
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    for await (const chunk of streamResponse) {
      if (clientClosed || res.writableEnded) {
        break;
      }

      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    if (!clientClosed && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    console.error("api/chat error:", err);

    if (!res.headersSent) {
      return res.status(500).json({
        error: err?.message || err?.error?.message || "Unknown server error",
      });
    }

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: err?.message || err?.error?.message || "Unknown server error",
        })}\n\n`
      );
      res.end();
    }
  }
}