import type { ChatProvider } from "@/providers/base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

const TEXT_MODEL = "llama-3.1-8b-instant";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function toGroqMessage(m: ChatMessage) {
  if (!m.images || m.images.length === 0) {
    return { role: m.role, content: m.content };
  }
  return {
    role: m.role,
    content: [
      { type: "text", text: m.content },
      ...m.images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img.dataUrl },
      })),
    ],
  };
}

function pickModel(history: ChatMessage[]) {
  return history.some((m) => m.images && m.images.length > 0) ? VISION_MODEL : TEXT_MODEL;
}

export const groqProvider: ChatProvider = {
  id: "groq",
  displayName: "Groq",
  async send(_input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult> {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: pickModel(history),
        messages: history.map(toGroqMessage),
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Groq API error (${r.status}): ${t || r.statusText}`);
    }
    const data = (await r.json()) as { assistantText: string };
    return { assistantText: data.assistantText || "" };
  },
  async stream(input: ChatSendInput, history: ChatMessage[], handlers) {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: handlers.signal,
      body: JSON.stringify({
        model: pickModel(history),
        conversationId: input.conversationId,
        provider: input.provider,
        userText: input.userText,
        messages: history.map(toGroqMessage),
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Groq API error (${r.status}): ${t || r.statusText}`);
    }
    const reader = r.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        if (handlers.signal?.aborted) {
          handlers.onAbort?.();
          throw new DOMException("Aborted", "AbortError");
        }
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const line = chunk.trim();
          if (!line.startsWith("data:")) continue;
          const raw = line.replace(/^data:\s*/, "");
          try {
            const json = JSON.parse(raw);
            if (json.token) {
              handlers.onToken(json.token);
            }
            if (json.done) {
              handlers.onDone?.();
              return;
            }
            if (json.error) {
              throw new Error(json.error);
            }
          } catch (error) {
            if (error instanceof Error) throw error;
          }
        }
      }
      handlers.onDone?.();
    } finally {
      reader.releaseLock();
    }
  },
};
