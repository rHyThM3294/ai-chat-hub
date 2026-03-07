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
function sleep(ms: number){
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export const useChatStore = defineStore("chat", () => {
  const conversationId = ref(uid("c"));
  const provider = ref<ProviderId>("mock");
  const messages = ref<ChatMessage[]>([]);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const currentProvider = computed(() => providers[provider.value]);
  function resetConversation(){
    conversationId.value = uid("c");
    messages.value = [];
    error.value = null;
  }
  async function typeAssistantMessage(targetMsg: ChatMessage, fullText: string){
    targetMsg.content = "";
    // 你可以調整打字速度
    const baseDelay = 18;
    for (let i = 0; i < fullText.length; i++){
      targetMsg.content += fullText[i];
      // 標點符號稍微停久一點，比較像真人
      const char = fullText.charAt(i);
      if ("，。、！？：；,.!?;:\n".includes(char)){
        await sleep(baseDelay * 3);
      }else{
        await sleep(baseDelay);
      }
    }
  }
  async function sendUserText(userText: string){
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
    try{
      const p = currentProvider.value;
      if (!p) throw new Error("Provider not found");
      const res = await p.send(
        {
          conversationId: conversationId.value,
          provider: provider.value,
          userText: text,
        },
        messages.value
      );
      const botMsg: ChatMessage = {
        id: uid("a"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      };
      messages.value.push(botMsg);
      await typeAssistantMessage(botMsg, res.assistantText);
    }catch (e){
      error.value = e instanceof Error ? e.message : "Unknown error";
    }finally{
      sending.value = false;
    }
  }
  return{
    conversationId,
    provider,
    messages,
    sending,
    error,
    resetConversation,
    sendUserText,
  };
});