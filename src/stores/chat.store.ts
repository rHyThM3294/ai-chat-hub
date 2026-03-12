import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { ChatMessage, ProviderId } from "@/types/chat";
import { uid } from "@/types/chat";
import type { ChatProvider } from "@/providers/base";

import { mockProvider } from "@/providers/mock";
import { openaiProvider } from "@/providers/openai";
import { groqProvider } from "@/providers/groq";

const providers: Partial<Record<ProviderId, ChatProvider>> = {
  mock: mockProvider,
  openai: openaiProvider,
  groq: groqProvider,
};

export const useChatStore = defineStore("chat", () => {
  const conversationId = ref(uid("c"));
  const provider = ref<ProviderId>("mock");
  const messages = ref<ChatMessage[]>([]);
  const sending = ref(false);
  const error = ref<string | null>(null);

  const currentProvider = computed(() => providers[provider.value]);

  function resetConversation() {
    conversationId.value = uid("c");
    messages.value = [];
    error.value = null;
  }

  async function sendUserText(userText: string) {
    const text = userText.trim();
    if (!text || sending.value) return;

    sending.value = true;
    error.value = null;

    const userMsg: ChatMessage = {
      id: uid("u"),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    messages.value.push(userMsg);

    try {
      const p = currentProvider.value;
      if (!p) throw new Error("Provider not found");

      const input = {
        conversationId: conversationId.value,
        provider: provider.value,
        userText: text,
      };

      const botMsg: ChatMessage = {
        id: uid("a"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      messages.value.push(botMsg);

      if (p.stream) {
        await p.stream(input, messages.value, {
          onToken(token) {
            botMsg.content += token;
          },
        });
      } else {
        const res = await p.send(input, messages.value);
        botMsg.content = res.assistantText;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Unknown error";
    } finally {
      sending.value = false;
    }
  }

  return {
    conversationId,
    provider,
    messages,
    sending,
    error,
    resetConversation,
    sendUserText,
  };
});