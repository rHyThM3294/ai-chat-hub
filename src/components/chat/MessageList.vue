<template>
  <div class="sr-only" role="status" aria-live="polite">{{ latestAssistantAnnouncement }}</div>
  <section ref="conversationRef" class="conversation">
    <p v-if="chat.messages.length === 0" class="hint">目前使用 {{ chat.provider }} provider。</p>
    <div
      v-for="m in chat.messages"
      :key="m.id"
      class="messageRow"
      :class="{ isUser: m.role === 'user', isAssistant: m.role === 'assistant' }"
    >
      <div class="allMessage">
        <div class="messageBox">
          <span>{{ m.role === "user" ? "你" : "機器人" }}</span>
          <div class="messageMeta">
            <span class="messageToken">≈{{ m.tokenCount ?? 0 }} tokens</span>
            <span class="messageTime">
              {{ new Date(m.createdAt).toLocaleTimeString() }}
            </span>
          </div>
        </div>
        <MessageContent
          :content="m.content"
          :is-streaming="m.isStreaming"
          :role="m.role"
          :images="m.images"
          :can-regenerate="m.role === 'assistant' && !m.isStreaming && !chat.sending"
          @regenerate="handleRegenerate(m)"
        />
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useChatStore } from "@/stores/chat.store";
import type { ChatMessage } from "@/types/chat";
import MessageContent from "@/components/chat/MessageContent.vue";

const chat = useChatStore();
const conversationRef = ref<HTMLElement | null>(null);

function scrollToBottom(smooth = true) {
  const el = conversationRef.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}
function handleRegenerate(message: ChatMessage) {
  if (message.role !== "assistant") return;
  chat.regenerateAssistantMessage?.(message.id);
}

// 只在一則 AI 回覆真正完成時廣播一次給螢幕閱讀器，而不是逐字廣播造成干擾
const lastMessage = computed(() => chat.messages[chat.messages.length - 1] ?? null);
const latestAssistantAnnouncement = ref("");
const lastCompletedAssistantText = computed(() => {
  const last = lastMessage.value;
  if (last && last.role === "assistant" && !last.isStreaming) {
    return last.content;
  }
  return "";
});
watch(lastCompletedAssistantText, (text) => {
  if (text) latestAssistantAnnouncement.value = text;
});

watch(
  () => chat.messages.map((m) => m.content).join("").length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);
watch(
  () => chat.error,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);
watch(
  () => chat.activeConversationId,
  async () => {
    await nextTick();
    scrollToBottom(false);
  }
);
onMounted(() => {
  scrollToBottom(false);
});
</script>
<style scoped>
.conversation {
  width: min(92%, 1100px);
  margin: 0 auto;
  flex: 1;
  min-height: 50vh;
  overflow-y: auto;
  display: flex;
  flex-flow: column nowrap;
  gap: 1em;
  padding: 1em 0.25em 0.5em;
  scroll-behavior: smooth;
}
.hint {
  font-size: 1em;
  font-weight: 700;
  color: #ff93fd;
  text-align: center;
  margin: auto 0;
}
.messageRow {
  width: 100%;
  display: flex;
}
.messageRow.isUser {
  justify-content: flex-end;
}
.messageRow.isAssistant {
  justify-content: flex-start;
}
.allMessage {
  max-width: 88%;
  padding: 0.9em 1em;
  border-radius: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.messageActions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
.messageActionButton {
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  background-color: var(--color-action-btn-bg);
  color: inherit;
  transition: all 250ms ease;
}
.messageActionButton:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.messageRow.isUser .allMessage {
  background-color: var(--color-accent);
  color: var(--color-accent-contrast);
  border-bottom-right-radius: 4px;
}
.messageRow.isAssistant .allMessage {
  background-color: var(--color-bubble-assistant-bg);
  color: var(--color-bubble-assistant-text);
  border-bottom-left-radius: 4px;
}
.messageBox {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  font-weight: 700;
}
.messageMeta {
  display: flex;
  gap: 0.5em;
  align-items: center;
  flex-wrap: wrap;
}
.messageToken,
.messageTime {
  font-size: 0.75em;
  opacity: 0.7;
  font-weight: 400;
}
@media (width > 768px) {
  .conversation {
    min-height: 45vh;
    max-height: 58vh;
  }
  .allMessage {
    max-width: 70%;
  }
  .hint {
    font-size: 1.15em;
  }
  .messageActionButton:hover:not(:disabled) {
    background-color: var(--color-action-btn-bg-hover);
  }
}
</style>
