import type { ChatProvider } from "@/providers/base";
import type { ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

export const groqProvider: ChatProvider = {
  id: "groq",
  displayName: "Groq",
  async send(_input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult> {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Groq API error (${r.status}):${t || r.statusText}`);
    }

    const data = (await r.json()) as { assistantText: string };
    return { assistantText: data.assistantText || "" };
  },
};