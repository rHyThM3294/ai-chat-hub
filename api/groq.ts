type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};
export default async function handler(req: any, res: any) {
  let streamingStarted = false;  // 追蹤是否已開始串流
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
      console.log('API Key:', apiKey) // 先印出來確認有沒有值
    }
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: "Invalid JSON in request body" });
    }
    const messages = body?.messages as ChatMessage[] | undefined;
    const model = body?.model || "llama-3.1-8b-instant";
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({
        error: errText || "Groq upstream error",
      });
    }
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.flushHeaders();
    streamingStarted = true;  // 標記已開始串流
    const reader = upstream.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: "No upstream reader" })}\n\n`);
      return res.end();
    }
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.replace(/^data:\s*/, "");
        if (data === "[DONE]") {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();  // 直接結束，避免重複
        }
        try {
          const json = JSON.parse(data);
          const token = json?.choices?.[0]?.delta?.content ?? "";
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        }catch{
          // 忽略解析失敗的小片段
        }
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any){
    console.error("api/groq stream error:", err);
    if (streamingStarted) {
      // 如果已開始串流，將錯誤寫入串流
      res.write(`data: ${JSON.stringify({ error: err?.message || "Unknown server error" })}\n\n`);
      res.end();
    } else {
      // 否則，使用標準錯誤回應
      return res.status(500).json({
        error: err?.message || "Unknown server error",
      });
    }
  }
}