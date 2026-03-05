import type { ChatProvider, ChatMessage, ChatSendInput, ChatSendResult } from "@/types/chat";

export const groqProvider: ChatProvider = {
  key: "groq",
  name: "Groq",

  async send(_input: ChatSendInput, history: ChatMessage[]): Promise<ChatSendResult> {
    const r = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: history.map(m => ({
          role: m.role,
          content: m.content
        })),
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      throw new Error(data?.error || `Groq API error (${r.status})`);
    }

    return {
      assistantText: data.assistantText
    };
  },
};