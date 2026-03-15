import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { ChatMessage, ProviderId } from "@/types/chat";
import { uid } from "@/types/chat";
import type { ChatProvider } from "@/providers/base";
import { estimateTokens } from "@/utils/token";
import { mockProvider } from "@/providers/mock";
import { openaiProvider } from "@/providers/openai";
import { groqProvider } from "@/providers/groq";
const providers: Partial<Record<ProviderId, ChatProvider>> = {
  mock: mockProvider,
  openai: openaiProvider,
  groq: groqProvider,
};
const STORAGE_KEY = "ai-chat-hub-history";
interface PersistedChatState {
  conversationId: string;
  provider: ProviderId;
  messages: ChatMessage[];
}
function loadPersistedState(): PersistedChatState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedChatState;
  } catch {
    return null;
  }
}
function savePersistedState(state: PersistedChatState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export const useChatStore = defineStore("chat", () => {
  const persisted = loadPersistedState();
  const conversationId = ref(persisted?.conversationId ?? uid("c"));
  const provider = ref<ProviderId>(persisted?.provider ?? "mock");
  const messages = ref<ChatMessage[]>(persisted?.messages ?? []);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const currentProvider = computed(() => providers[provider.value]);
  const totalTokens = computed(() =>
    messages.value.reduce((sum, msg) => sum + (msg.tokenCount ?? estimateTokens(msg.content)), 0)
  );
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
      tokenCount: estimateTokens(text),
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
        tokenCount: 0,
        isStreaming: true,
      };
      messages.value.push(botMsg);
      if (p.stream) {
        await p.stream(input, messages.value, {
          onToken(token) {
            botMsg.content += token;
            botMsg.tokenCount = estimateTokens(botMsg.content);
          },
          onDone() {
            botMsg.isStreaming = false;
          },
        });
      } else {
        const res = await p.send(input, messages.value);
        botMsg.content = res.assistantText;
        botMsg.tokenCount = estimateTokens(res.assistantText);
        botMsg.isStreaming = false;
      }
    }catch (e){
      error.value = e instanceof Error ? e.message : "Unknown error";
    }finally{
      sending.value = false;
    }
  }
  watch(
    [conversationId, provider, messages],
    () => {
      savePersistedState({
        conversationId: conversationId.value,
        provider: provider.value,
        messages: messages.value,
      });
    },
    { deep: true }
  );
  return{
    conversationId,
    provider,
    messages,
    sending,
    error,
    totalTokens,
    resetConversation,
    sendUserText,
  };
});