<template>
  <header class="topBlock">
    <div class="titleRow">
      <div class="titleGroup">
        <h2 class="titleText">AI Chat Hub(MVP)</h2>
        <p class="providerText">目前Provider：{{ chat.provider }}</p>
        <p class="tokenText">目前對話Token：約{{ chat.totalTokens }}</p>
      </div>
    </div>
    <div class="allModel">
      <select v-model="chat.provider" class="model" aria-label="選擇 AI 供應商">
        <option value="mock">Mock</option>
        <option value="openai" disabled>OpenAI</option>
        <option value="groq">Groq</option>
        <option value="gemini" disabled>Gemini</option>
        <option value="perplexity" disabled>Perplexity</option>
      </select>
      <button
        type="button"
        class="themeToggle"
        :aria-label="theme === 'dark' ? '切換為亮色主題' : '切換為暗色主題'"
        @click="toggleTheme"
      >
        <i :class="theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"></i>
      </button>
      <div ref="exportWrapperRef" class="exportWrapper">
        <button
          type="button"
          class="exportButton"
          aria-label="匯出對話"
          aria-haspopup="true"
          :aria-expanded="exportMenuOpen"
          :disabled="chat.messages.length === 0"
          @click="toggleExportMenu"
        >
          <i class="fa-solid fa-download"></i>
        </button>
        <div v-if="exportMenuOpen" class="exportMenu" role="menu">
          <button
            type="button"
            class="exportMenuItem"
            role="menuitem"
            @click="handleExport('markdown')"
          >
            匯出 Markdown
          </button>
          <button
            type="button"
            class="exportMenuItem"
            role="menuitem"
            @click="handleExport('json')"
          >
            匯出 JSON
          </button>
        </div>
      </div>
      <button type="button" class="newChat" @click="chat.createNewConversation()">新對話</button>
    </div>
  </header>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useChatStore } from "@/stores/chat.store";
import { useTheme } from "@/composables/useTheme";
import { exportConversation, type ExportFormat } from "@/utils/exportConversation";

const chat = useChatStore();
const { theme, toggleTheme } = useTheme();
const exportMenuOpen = ref(false);
const exportWrapperRef = ref<HTMLElement | null>(null);

function toggleExportMenu() {
  exportMenuOpen.value = !exportMenuOpen.value;
}
function handleExport(format: ExportFormat) {
  if (chat.activeConversation) {
    exportConversation(chat.activeConversation, format);
  }
  exportMenuOpen.value = false;
}
function handleWindowClick(e: MouseEvent) {
  if (!exportMenuOpen.value) return;
  const target = e.target as Node;
  if (exportWrapperRef.value && !exportWrapperRef.value.contains(target)) {
    exportMenuOpen.value = false;
  }
}
function handleWindowKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && exportMenuOpen.value) {
    exportMenuOpen.value = false;
  }
}
onMounted(() => {
  window.addEventListener("click", handleWindowClick);
  window.addEventListener("keydown", handleWindowKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("click", handleWindowClick);
  window.removeEventListener("keydown", handleWindowKeydown);
});
</script>
<style scoped>
.topBlock {
  width: min(92%, 1100px);
  margin: 0 auto;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.9em;
}
.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1em;
}
.titleGroup {
  min-width: 0;
}
.titleText {
  margin: 0;
  font-size: 1.5rem;
}
.providerText,
.tokenText {
  margin: 0.3em 0 0;
  opacity: 0.7;
}
.allModel {
  display: flex;
  flex-flow: row wrap;
  gap: 0.75em;
}
.model {
  min-height: 42px;
  background-color: #000000;
  color: #ffffff;
  padding: 0.5em 1em;
  border-radius: 8px;
}
.newChat {
  min-height: 42px;
  padding: 0.5em 1.25em;
  border: none;
  border-radius: 8px;
  background-color: var(--color-accent);
  color: var(--color-accent-contrast);
  transition: all ease 300ms;
}
.themeToggle {
  min-height: 42px;
  min-width: 42px;
  padding: 0.5em;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all ease 300ms;
}
.exportWrapper {
  position: relative;
}
.exportButton {
  min-height: 42px;
  min-width: 42px;
  padding: 0.5em;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: all ease 300ms;
}
.exportButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.exportMenu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background-color: var(--color-surface);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}
.exportMenuItem {
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition: all ease 200ms;
}
.exportMenuItem:hover {
  background-color: var(--color-hover-surface);
}
@media (width > 768px) {
  .newChat:hover:not(:disabled) {
    color: gold;
    background-color: #000000;
  }
  .themeToggle:hover {
    background-color: var(--color-hover-surface);
  }
  .exportButton:hover:not(:disabled) {
    background-color: var(--color-hover-surface);
  }
}
</style>
