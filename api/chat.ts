type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };
export const config = {
  api: {
    bodyParser: true,
  },
};
// 共用函數：轉換訊息格式
function transformMessages(messages: ChatMessage[]){
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
export default async function handler(req: any, res: any){
  try{
    // 1. 檢查 HTTP 方法
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
    // 2. 檢查 API 金鑰
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }
    // 3. 解析請求體
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body?.messages as ChatMessage[] | undefined;
    const model = body?.model || "gpt-4o-mini";
    const stream = Boolean(body?.stream);
    // 4. 驗證訊息
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages is required" });
    }
    // 5. 建立 OpenAI 客戶端
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    // 6. 處理非串流請求
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
    // 7. 處理串流請求
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
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("api/chat error:", err);
    // 8. 錯誤處理
    if (!res.headersSent) {
      return res.status(500).json({
        error: err?.message || err?.error?.message || "Unknown server error",
      });
    }
    // 如果已經開始串流，發送錯誤事件
    res.write(
      `data: ${JSON.stringify({
        error: err?.message || err?.error?.message || "Unknown server error",
      })}\n\n`
    );
    res.end();
  }
}