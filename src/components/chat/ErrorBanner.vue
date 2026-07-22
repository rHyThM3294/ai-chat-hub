<template>
  <div v-if="chat.error" class="errorBanner" role="alert">
    <div class="errorBannerMain">
      <i class="fa-solid fa-triangle-exclamation errorBannerIcon"></i>
      <span class="errorBannerText">{{ friendlyError }}</span>
    </div>
    <div class="errorBannerActions">
      <button v-if="canRetryError" type="button" class="errorRetryButton" @click="retryLastFailed">
        重試
      </button>
      <button
        type="button"
        class="errorDismissButton"
        aria-label="關閉錯誤提示"
        @click="chat.dismissError()"
      >
        ✕
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useChatStore } from "@/stores/chat.store";
import { humanizeError } from "@/utils/errorMessage";

const chat = useChatStore();
const friendlyError = computed(() => humanizeError(chat.error));
const lastMessage = computed(() => chat.messages[chat.messages.length - 1] ?? null);
const canRetryError = computed(
  () => !!chat.error && lastMessage.value?.role === "assistant" && !chat.sending
);
function retryLastFailed() {
  if (!lastMessage.value) return;
  chat.regenerateAssistantMessage(lastMessage.value.id);
}
</script>
<style scoped>
.errorBanner {
  width: min(92%, 1100px);
  margin: 0.9em auto 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5em;
  padding: 0.75em 1em;
  border-radius: 0.8em;
  border: 1px solid var(--color-error);
  background-color: var(--color-bg-elevated);
  color: var(--color-error);
}
.errorBannerMain {
  display: flex;
  align-items: flex-start;
  gap: 0.6em;
}
.errorBannerIcon {
  flex-shrink: 0;
  margin-top: 0.2em;
}
.errorBannerText {
  flex: 1;
  font-weight: 600;
  line-height: 1.5;
}
.errorBannerActions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5em;
  flex-shrink: 0;
}
.errorRetryButton {
  border: 1px solid var(--color-error);
  border-radius: 8px;
  padding: 0.4em 0.9em;
  background-color: transparent;
  color: var(--color-error);
  font-weight: 600;
  cursor: pointer;
  transition: all ease 200ms;
}
.errorRetryButton:hover {
  background-color: var(--color-error);
  color: var(--color-accent-contrast);
}
.errorDismissButton {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: var(--color-error);
  cursor: pointer;
  transition: all ease 200ms;
}
.errorDismissButton:hover {
  background-color: var(--color-action-btn-bg-hover);
}
@media (width > 768px) {
  .errorBanner {
    flex-direction: row;
    align-items: center;
  }
  .errorBannerMain {
    flex: 1;
  }
}
</style>
