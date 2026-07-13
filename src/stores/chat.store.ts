import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import type { ChatConversation, ChatImageAttachment, ChatMessage, ProviderId } from "@/types/chat";
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
  activeConversationId: string;
  conversations: ChatConversation[];
}
function createConversation(provider: ProviderId = "mock"): ChatConversation {
  const now = Date.now();
  return {
    id: uid("c"),
    title: "新對話",
    provider,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("無法儲存對話紀錄（可能是圖片附件超過瀏覽器儲存上限）：", err);
  }
}
export const useChatStore = defineStore("chat", () => {
  const persisted = loadPersistedState();
  const conversations = ref<ChatConversation[]>(
    persisted?.conversations?.length ? persisted.conversations : [createConversation("mock")]
  );
  const activeConversationId = ref<string>(
    persisted?.activeConversationId ?? conversations.value[0]?.id ?? ""
  );
  const sending = ref(false);
  const currentAbortController = ref<AbortController | null>(null);
  let currentDisplayQueue: ReturnType<typeof createDisplayQueue> | null = null;
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
    get() {
      return activeConversation.value?.provider ?? "mock";
    },
    set(value) {
      if (!activeConversation.value) return;
      activeConversation.value.provider = value;
      activeConversation.value.updatedAt = Date.now();
    },
  });
  const totalTokens = computed(() =>
    messages.value.reduce((sum, msg) => sum + (msg.tokenCount ?? estimateTokens(msg.content)), 0)
  );
  function ensureActiveConversation() {
    if (!conversations.value.length) {
      const chat = createConversation("mock");
      conversations.value.push(chat);
      activeConversationId.value = chat.id;
    }
    const exists = conversations.value.some((item) => item.id === activeConversationId.value);
    if (!exists) {
      activeConversationId.value = conversations.value[0]?.id ?? "";
    }
  }
  function createNewConversation(nextProvider?: ProviderId) {
    const chat = createConversation(nextProvider ?? provider.value ?? "mock");
    conversations.value.unshift(chat);
    activeConversationId.value = chat.id;
    error.value = null;
  }
  function switchConversation(conversationId: string) {
    const exists = conversations.value.some((item) => item.id === conversationId);
    if (!exists) return;
    activeConversationId.value = conversationId;
    error.value = null;
  }
  function deleteConversation(conversationId: string) {
    const index = conversations.value.findIndex((item) => item.id === conversationId);
    if (index === -1) return;
    conversations.value.splice(index, 1);
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id ?? "";
    }
    ensureActiveConversation();
    error.value = null;
  }
  function renameConversation(conversationId: string, title: string) {
    const target = conversations.value.find((item) => item.id === conversationId);
    if (!target) return;
    target.title = title.trim() || "未命名對話";
    target.updatedAt = Date.now();
  }
  function updateTitleFromFirstUserMessage(conversationId: string) {
    const target = conversations.value.find((item) => item.id === conversationId);
    if (!target) return;
    if (target.title !== "新對話") return;
    const firstUserMessage = target.messages.find((m) => m.role === "user");
    if (!firstUserMessage) return;
    target.title = firstUserMessage.content.slice(0, 18) || "未命名對話";
    target.updatedAt = Date.now();
  }
  function stopGenerating() {
    if (!sending.value) return;
    // 就算網路串流已經結束、只剩逐字動畫還在跑，也要能立即停止
    currentDisplayQueue?.abort();
    if (!currentAbortController.value) return;
    currentAbortController.value.abort();
  }
  function resetConversation() {
    if (!activeConversation.value) return;
    activeConversation.value.messages = [];
    activeConversation.value.title = "新對話";
    activeConversation.value.updatedAt = Date.now();
    error.value = null;
  }
  function isAbortError(err: unknown) {
    return (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    );
  }
  // 從響應式陣列取得最後一個 assistant 訊息（讓 Vue Proxy 能追蹤變化）
  function getLastAssistantMsg(targetConversation: ChatConversation): ChatMessage | null {
    const last = targetConversation.messages[targetConversation.messages.length - 1];
    if (last && last.role === "assistant") return last;
    return null;
  }
  function createDisplayQueue(intervalMs = 30) {
    let queue: string[] = [];
    let timer: number | null = null;
    let onFlush: ((token: string) => void) | null = null;
    let onEmpty: (() => void) | null = null;
    function start(flush: (token: string) => void) {
      onFlush = flush;
      if (timer !== null) return;
      timer = window.setInterval(() => {
        const token = queue.shift();
        if (token !== undefined) {
          onFlush?.(token);
        }
        // 佇列清空且已標記結束，才呼叫 onEmpty
        if (queue.length === 0 && onEmpty) {
          const callback = onEmpty;
          onEmpty = null;
          callback();
        }
      }, intervalMs);
    }
    function push(token: string) {
      queue.push(token);
    }

    // 不立刻清空，等佇列跑完才執行 callback
    function drain(callback: () => void) {
      if (queue.length === 0) {
        // 佇列已空，直接執行
        if (timer !== null) {
          window.clearInterval(timer);
          timer = null;
        }
        callback();
      } else {
        // 佇列還有字，等跑完再執行
        onEmpty = () => {
          if (timer !== null) {
            window.clearInterval(timer);
            timer = null;
          }
          callback();
        };
      }
    }
    function abort() {
      // 強制停止，清空佇列（用於中止生成）
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
      queue = [];
      // 若有等待中的 drain callback，一併觸發，避免呼叫端卡住等不到結果
      if (onEmpty) {
        const callback = onEmpty;
        onEmpty = null;
        callback();
      }
    }
    return { push, start, drain, abort };
  }
  async function sendUserText(userText: string, images?: ChatImageAttachment[]) {
    const text = userText.trim();
    if (!text || sending.value) return;
    if (!activeConversation.value) return;
    sending.value = true;
    error.value = null;
    const targetConversation = activeConversation.value;
    const userMsg: ChatMessage = {
      id: uid("u"),
      role: "user",
      content: text,
      createdAt: Date.now(),
      tokenCount: estimateTokens(text),
      ...(images && images.length > 0 ? { images } : {}),
    };
    targetConversation.messages.push(userMsg);
    targetConversation.updatedAt = Date.now();
    updateTitleFromFirstUserMessage(targetConversation.id);

    try {
      const history = [...targetConversation.messages];
      await generateAssistantReply(targetConversation, history, text);
    } catch (e) {
      if (isAbortError(e)) {
        const lastAssistant = [...targetConversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if (lastAssistant) {
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
      if (lastAssistant) {
        lastAssistant.isStreaming = false;
        lastAssistant.content = lastAssistant.content || "發生錯誤，請稍後再試一次。";
        lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
      }
      targetConversation.updatedAt = Date.now();
    } finally {
      sending.value = false;
    }
  }

  async function generateAssistantReply(
    targetConversation: ChatConversation,
    history: ChatMessage[],
    userText: string
  ) {
    const p = providers[targetConversation.provider];
    if (!p) throw new Error("Provider not found");
    const controller = new AbortController();
    currentAbortController.value = controller;
    const input = {
      conversationId: targetConversation.id,
      provider: targetConversation.provider,
      userText,
    };

    // 直接 push 進響應式陣列
    targetConversation.messages.push({
      id: uid("a"),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      tokenCount: 0,
      isStreaming: true,
    });
    targetConversation.updatedAt = Date.now();

    try {
      if (p.stream) {
        const queue = createDisplayQueue(30); // 30ms 一個字，可以調整這個數字
        currentDisplayQueue = queue;
        let resolveDrained: () => void = () => {};
        const drained = new Promise<void>((resolve) => {
          resolveDrained = resolve;
        });
        queue.start((token) => {
          const last = getLastAssistantMsg(targetConversation);
          if (last) last.content += token;
        });
        try {
          await p.stream(input, history, {
            signal: controller.signal,
            onToken(token) {
              queue.push(token);
            },
            onDone() {
              queue.drain(() => {
                const last = getLastAssistantMsg(targetConversation);
                if (last) {
                  last.isStreaming = false;
                  last.tokenCount = estimateTokens(last.content);
                }
                targetConversation.updatedAt = Date.now();
                resolveDrained();
              });
            },
            onAbort() {
              queue.abort();
              const last = getLastAssistantMsg(targetConversation);
              if (last) {
                last.isStreaming = false;
                last.tokenCount = estimateTokens(last.content);
              }
              targetConversation.updatedAt = Date.now();
              resolveDrained();
            },
          });
          // 等畫面上的逐字動畫真的跑完，`sending` 才能真正結束，
          // 否則使用者可能在動畫跑完前搶送下一則訊息，造成兩則回覆的文字互相交錯
          await drained;
        } finally {
          queue.abort();
        }
      } else {
        const res = await p.send(input, history);
        const last = getLastAssistantMsg(targetConversation);
        if (last) {
          last.content = res.assistantText;
          last.tokenCount = estimateTokens(res.assistantText);
          last.isStreaming = false;
        }
        targetConversation.updatedAt = Date.now();
      }
    } finally {
      if (currentAbortController.value === controller) {
        currentAbortController.value = null;
      }
      if (currentDisplayQueue) {
        currentDisplayQueue = null;
      }
    }
  }
  async function editUserMessageAndResend(messageId: string, newContent: string) {
    const conversation = activeConversation.value;
    if (!conversation || sending.value) return;
    const nextContent = newContent.trim();
    if (!nextContent) return;
    const index = conversation.messages.findIndex((item) => item.id === messageId);
    if (index === -1) return;
    const targetMessage = conversation.messages[index];
    if (!targetMessage || targetMessage.role !== "user") return;
    sending.value = true;
    error.value = null;
    targetMessage.content = nextContent;
    targetMessage.createdAt = Date.now();
    targetMessage.tokenCount = estimateTokens(nextContent);
    conversation.messages.splice(index + 1);
    conversation.updatedAt = Date.now();
    try {
      const history = [...conversation.messages];
      await generateAssistantReply(conversation, history, nextContent);
      updateTitleFromFirstUserMessage(conversation.id);
    } catch (e) {
      if (isAbortError(e)) {
        const lastAssistant = [...conversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if (lastAssistant) {
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
      if (lastAssistant) {
        lastAssistant.isStreaming = false;
        lastAssistant.content = lastAssistant.content || "發生錯誤，請再試一次。";
        lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
      }
      conversation.updatedAt = Date.now();
    } finally {
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
    try {
      await generateAssistantReply(targetConversation, historyBeforeAssistant, userMessage.content);
    } catch (e) {
      if (isAbortError(e)) {
        const lastAssistant = [...targetConversation.messages]
          .reverse()
          .find((msg) => msg.role === "assistant" && msg.isStreaming);
        if (lastAssistant) {
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
      if (lastAssistant) {
        lastAssistant.isStreaming = false;
        lastAssistant.content = lastAssistant.content || "發生錯誤，請稍後再試一次。";
        lastAssistant.tokenCount = estimateTokens(lastAssistant.content);
      }
      targetConversation.updatedAt = Date.now();
    } finally {
      sending.value = false;
    }
  }
  ensureActiveConversation();
  let persistTimer: number | null = null;
  watch(
    [conversations, activeConversationId],
    () => {
      if (sending.value) return;
      if (persistTimer) {
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
  return {
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
