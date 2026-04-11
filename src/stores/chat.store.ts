import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { ChatConversation, ChatMessage, ProviderId } from "@/types/chat";
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

interface PersistedChatState{
  activeConversationId: string;
  conversations: ChatConversation[];
}
function createConversation(provider: ProviderId = "mock"): ChatConversation{
  const now = Date.now();
  return{
    id: uid("c"),
    title: "新對話",
    provider,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
function loadPersistedState(): PersistedChatState | null{
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedChatState;
  }catch{
    return null;
  }
}
function savePersistedState(state: PersistedChatState){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export const useChatStore = defineStore("chat", () => {
  const persisted = loadPersistedState();
  const conversations = ref<ChatConversation[]>(
    persisted?.conversations?.length
      ? persisted.conversations
      : [createConversation("mock")]
  );
  const activeConversationId = ref<string>(
    persisted?.activeConversationId ?? (conversations.value[0]?.id ?? "")
  );
  const sending = ref(false);
  const currentAbortController = ref<AbortController | null>(null);
  const canStop = computed(() => sending.value);
  const error = ref<string | null>(null);
  const activeConversation = computed(() => {
    return (
      conversations.value.find((item) => item.id === activeConversationId.value) ??
      conversations.value[0] ??
      null
    );
  });
  const messages = computed(() => activeConversation.value?.messages ?? []);
  const provider = computed<ProviderId>({
    get(){
      return activeConversation.value?.provider ?? "mock";
    },
    set(value){
      if (!activeConversation.value) return;
      activeConversation.value.provider = value;
      activeConversation.value.updatedAt = Date.now();
    },
  });
  const totalTokens = computed(() =>
    messages.value.reduce(
      (sum, msg) => sum + (msg.tokenCount ?? estimateTokens(msg.content)),
      0
    )
  );
  function ensureActiveConversation(){
    if (!conversations.value.length) {
      const chat = createConversation("mock");
      conversations.value.push(chat);
      activeConversationId.value = chat.id;
    }
    const exists = conversations.value.some(
      (item) => item.id === activeConversationId.value
    );
    if (!exists){
      activeConversationId.value = conversations.value[0]?.id ?? "";
    }
  }
  function createNewConversation(nextProvider?: ProviderId){
    const chat = createConversation(nextProvider ?? provider.value ?? "mock");
    conversations.value.unshift(chat);
    activeConversationId.value = chat.id;
    error.value = null;
  }
  function switchConversation(conversationId: string){
    const exists = conversations.value.some((item) => item.id === conversationId);
    if (!exists) return;
    activeConversationId.value = conversationId;
    error.value = null;
  }
  function deleteConversation(conversationId: string){
    const index = conversations.value.findIndex((item) => item.id === conversationId);
    if (index === -1) return;
    conversations.value.splice(index, 1);
    if (activeConversationId.value === conversationId){
      activeConversationId.value = conversations.value[0]?.id ?? "";
    }
    ensureActiveConversation();
    error.value = null;
  }
  function renameConversation(conversationId: string, title: string){
    const target = conversations.value.find((item) => item.id === conversationId);
    if (!target) return;
    target.title = title.trim() || "未命名對話";
    target.updatedAt = Date.now();
  }
  function updateTitleFromFirstUserMessage(conversationId: string){
    const target = conversations.value.find((item) => item.id === conversationId);
    if(!target) return;
    if(target.title !== "新對話")return;
    const firstUserMessage = target.messages.find((m) => m.role === "user");
    if(!firstUserMessage)return;
    target.title = firstUserMessage.content.slice(0, 18) || "未命名對話";
    target.updatedAt = Date.now();
  }
  function stopGenerating(){
    if (!sending.value) return;
    if (!currentAbortController.value) return;
    currentAbortController.value.abort();
  }
  function resetConversation(){
    if(!activeConversation.value)return;
    activeConversation.value.messages = [];
    activeConversation.value.title = "新對話";
    activeConversation.value.updatedAt = Date.now();
    error.value = null;
  }
  function isAbortError(error: unknown){
    return (
      error instanceof DOMException && error.name === "AbortError"
    ) || (
      error instanceof Error && error.name === "AbortError"
    );
  }
  async function sendUserText(userText:string){
    const text = userText.trim();
    if(!text || sending.value) return;
    if(!activeConversation.value) return;
    sending.value = true;
    error.value = null;
    const controller = new AbortController();
    currentAbortController.value = controller;
    const targetConversation = activeConversation.value;
    const userMsg:ChatMessage = {
      id:uid("u"),
      role:"user",
      content: text,
      createdAt:Date.now(),
      tokenCount:estimateTokens(text),
    };
    targetConversation.messages.push(userMsg);
    targetConversation.updatedAt = Date.now();
    updateTitleFromFirstUserMessage(targetConversation.id);
    try{
      const p = providers[targetConversation.provider];
      if(!p)throw new Error("Provider not found");
      const input = {
        conversationId: targetConversation.id,
        provider:targetConversation.provider,
        userText:text,
      };
      const history = [...targetConversation.messages];
      const botMsg:ChatMessage = {
        id: uid("a"),
        role:"assistant",
        content:"",
        createdAt:Date.now(),
        tokenCount:0,
        isStreaming:true,
      };
      targetConversation.messages.push(botMsg);
      targetConversation.updatedAt = Date.now();
      if(p.stream){
        await p.stream(input, history,{
          signal:controller.signal,
          onToken(token){
            botMsg.content += token;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
          onDone(){
            botMsg.isStreaming = false;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
          onAbort(){
            botMsg.isStreaming = false;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
        });
      }else{
        const res = await p.send(input,history);
        botMsg.content = res.assistantText;
        botMsg.tokenCount = estimateTokens(res.assistantText);
        botMsg.isStreaming = false;
        targetConversation.updatedAt = Date.now();
      }
    }catch(e){
      if(isAbortError(e)){
        const lastAssistant = [...targetConversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if(lastAssistant){
          lastAssistant.isStreaming = false;
          lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
        }
        targetConversation.updatedAt = Date.now();
        return;
      }
      error.value = e instanceof Error ? e.message : "Unknown error";
      const lastAssistant = [...targetConversation.messages]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if(lastAssistant){
          lastAssistant.isStreaming = false;
          lastAssistant.content = lastAssistant.content || "發生錯誤，請稍後再試一次。"
          lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
        }
        targetConversation.updatedAt = Date.now();
    }finally{
      if(currentAbortController.value === controller){
        currentAbortController.value = null;
      }
      sending.value = false;
    }
  }
  async function generateAssistantReply(
    targetConversation: ChatConversation,
    history: ChatMessage[],
    userText: string
  ){
    const p = providers[targetConversation.provider];
    if(!p)throw new Error("Provider not found");
    const controller = new AbortController();
    currentAbortController.value = controller;
    const input = {
      conversationId: targetConversation.id,
      provider: targetConversation.provider,
      userText,
    };
    const botMsg: ChatMessage = {
      id: uid("a"),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      tokenCount: 0,
      isStreaming: true,
    };
    targetConversation.messages.push(botMsg);
    targetConversation.updatedAt = Date.now();
    try{
      if(p.stream){
        await p.stream(input, history, {
          signal: controller.signal,
          onToken(token){
            botMsg.content += token;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
          onDone(){
            botMsg.isStreaming = false;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
          onAbort(){
            botMsg.isStreaming = false;
            botMsg.tokenCount = estimateTokens(botMsg.content);
            targetConversation.updatedAt = Date.now();
          },
        });
      }else{
        const res = await p.send(input, history);
        botMsg.content = res.assistantText;
        botMsg.tokenCount = estimateTokens(res.assistantText);
        botMsg.isStreaming = false;
        targetConversation.updatedAt = Date.now();
      }
    }finally{
      if(currentAbortController.value === controller){
        currentAbortController.value = null;
      }
    }
  }
  async function editUserMessageAndResend(messageId: string, newContent: string){
    const conversation = activeConversation.value;
    if(!conversation || sending.value)return;
    const nextContent = newContent.trim();
    if(!nextContent)return;
    const index = conversation.messages.findIndex((item) => item.id === messageId);
    if(index === -1)return;
    const targetMessage = conversation.messages[index];
    if(!targetMessage || targetMessage.role !== "user")return;
    sending.value = true;
    error.value = null;
    targetMessage.content = nextContent;
    targetMessage.createdAt = Date.now();
    targetMessage.tokenCount = estimateTokens(nextContent);
    conversation.messages.splice(index + 1);
    conversation.updatedAt = Date.now();
    try{
      const history = [...conversation.messages];
      await generateAssistantReply(conversation,history,nextContent);
      updateTitleFromFirstUserMessage(conversation.id);
    }catch(e){
      if(isAbortError(e)){
        const lastAssistant = [...conversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if(lastAssistant){
          lastAssistant.isStreaming = false;
          lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
        }
        conversation.updatedAt = Date.now();
        return;
      }
      error.value = e instanceof Error ? e.message : "Unknown error";
      const lastAssistant = [...conversation.messages]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.isStreaming);
      if(lastAssistant){
        lastAssistant.isStreaming = false;
        lastAssistant.content = lastAssistant.content || "發生錯誤，請再試一次。";
        lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
      }
      conversation.updatedAt = Date.now();
    }finally{
      sending.value = false;
    }
  }
  async function regenerateAssistantMessage(messageId: string) {
    if (!activeConversation.value || sending.value) return;
    const targetConversation = activeConversation.value;
    const assistantIndex = targetConversation.messages.findIndex(
      (msg) => msg.id === messageId && msg.role === "assistant"
    );
    if (assistantIndex === -1) return;
    let userIndex = -1;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      const currentMessage = targetConversation.messages[i];
      if (currentMessage && currentMessage.role === "user") {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) return;
    const userMessage = targetConversation.messages[userIndex];
    if (!userMessage) return;
    const historyBeforeAssistant = targetConversation.messages.slice(0, assistantIndex);
    sending.value = true;
    error.value = null;
    targetConversation.messages = [...historyBeforeAssistant];
    targetConversation.updatedAt = Date.now();
    try{
      await generateAssistantReply(
        targetConversation,
        historyBeforeAssistant,
        userMessage.content
      );
    }catch (e){
      if(isAbortError(e)){
        const lastAssistant = [...targetConversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if (lastAssistant){
          lastAssistant.isStreaming = false;
          lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
        }
        targetConversation.updatedAt = Date.now();
        return;
      }
      error.value = e instanceof Error ? e.message : "Unknown error";
      const lastAssistant = [...targetConversation.messages]
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.isStreaming);
      if(lastAssistant){
        lastAssistant.isStreaming = false;
        lastAssistant.content =
          lastAssistant.content || "發生錯誤，請稍後再試一次。";
        lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
      }
      targetConversation.updatedAt = Date.now();
    }finally{
      sending.value = false;
    }
  }
  ensureActiveConversation();
  let persistTimer: number | null = null;
  watch(
    [conversations, activeConversationId],
    () => {
      if (sending.value) return;
      if (persistTimer){
        window.clearTimeout(persistTimer);
      }
      persistTimer = window.setTimeout(() => {
        savePersistedState({
          activeConversationId: activeConversationId.value,
          conversations: conversations.value,
        });
      }, 300);
    },
    { deep: true }
  );
  return{
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    provider,
    sending,
    error,
    totalTokens,
    canStop,
    createNewConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    resetConversation,
    sendUserText,
    editUserMessageAndResend,
    regenerateAssistantMessage,
    stopGenerating,
  };
});