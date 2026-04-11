<template>
  <div class="messageContentWrap">
    <div class="messageActions">
      <button
        type="button"
        class="messageActionButton"
        @click="copyMessage"
        title="複製訊息"
      >
        <i :class="messageCopied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
      </button>
      <button
        v-if="props.role === 'user' && props.canEdit"
        type="button"
        class="messageActionButton"
        @click="emit('edit')"
        title="編輯訊息"
      >
        <i class="fa-solid fa-pen"></i>
      </button>
      <button
        v-if="props.role === 'assistant' && props.canRegenerate"
        type="button"
        class="iconButton"
        @click="emit('regenerate')"
        title="重新生成"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>
    </div>
    <div class="messageContent" :class="{ isStreaming: props.isStreaming }">
      <div
        ref="contentRef"
        class="markdownBody"
        v-html="renderedHtml"
      ></div>
      <span
        v-if="props.isStreaming && props.content"
        class="streamCursor"
        aria-hidden="true"
      ></span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
const props = defineProps<{
  content: string;
  isStreaming?: boolean;
  role?: "user" | "assistant" | "system";
  canRegenerate?: boolean;
  canEdit?: boolean;
}>();
const emit = defineEmits<{
  (e: "regenerate"): void;
  (e: "edit"): void;
}>();
const contentRef = ref<HTMLElement | null>(null);
const messageCopied = ref(false);
let messageCopyTimer: number | null = null;
const mdUtils = new MarkdownIt().utils;
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(code, lang){
    const validLang = !!lang && hljs.getLanguage(lang);
    const highlighted = validLang
      ? hljs.highlight(code, { language: lang }).value
      : mdUtils.escapeHtml(code);
    const langLabel = lang || "code";
    return `
      <div class="codeBlockWrapper">
        <button
          type="button"
          class="codeCopyButton"
          data-code-copy="true"
          data-code="${encodeURIComponent(code)}"
          title="複製程式碼"
        >
          複製
        </button>
        <pre><code class="hljs language-${langLabel}">${highlighted}</code></pre>
      </div>
    `;
  },
});
const renderedHtml = computed(() => {
  return md.render(props.content || "");
});
function resetMessageCopyState() {
  if (messageCopyTimer) {
    window.clearTimeout(messageCopyTimer);
    messageCopyTimer = null;
  }
  messageCopied.value = false;
}
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.content ?? "");
    messageCopied.value = true;
    if (messageCopyTimer) {
      window.clearTimeout(messageCopyTimer);
    }
    messageCopyTimer = window.setTimeout(() => {
      messageCopied.value = false;
      messageCopyTimer = null;
    }, 1500);
  } catch (error){
    console.error("複製訊息失敗：", error);
  }
}
async function copyCodeFromButton(button: HTMLButtonElement){
  const rawCode = button.dataset.code ?? "";
  const code = decodeURIComponent(rawCode);
  try{
    await navigator.clipboard.writeText(code);
    const originalText = button.textContent || "複製";
    button.textContent = "已複製";
    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1200);
  }catch(error){
    console.error("複製程式碼失敗：", error);
  }
}
function handleContentClick(event: Event){
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const button = target.closest('[data-code-copy="true"]') as HTMLButtonElement | null;
  if (!button) return;
  copyCodeFromButton(button);
}
async function bindRenderedEvents(){
  await nextTick();
  if (!contentRef.value) return;
}
watch(
  () => renderedHtml.value,
  async () => {
    await bindRenderedEvents();
  },
  { immediate: true }
);
onMounted(() => {
  contentRef.value?.addEventListener("click", handleContentClick);
});
onBeforeUnmount(() => {
  contentRef.value?.removeEventListener("click", handleContentClick);
  resetMessageCopyState();
});
</script>
<style scoped>
.messageContentWrap{
  width: 100%;
}
.messageActions{
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
.messageContentWrap:hover .messageActions{
  opacity: 1;
  pointer-events: auto;
}
.messageActionButton{
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  background-color: #ffffff;
  color: #000000;
  transition: all 300ms ease;
}
.messageContent{
  white-space: normal;
  word-break: break-word;
  line-height: 1.7;
}
.markdownBody{
  display: inline;
}
.streamCursor{
  display: inline-block;
  width: 0.5em;
  height: 1.1em;
  margin-left: 0.15em;
  vertical-align: text-bottom;
  background-color: currentColor;
  border-radius: 2px;
  animation: blinkCursor 0.9s steps(1) infinite;
}
.messageContent :deep(.codeBlockWrapper){
  position: relative;
  margin: 0.8em 0;
}
.messageContent :deep(pre){
  overflow-x: auto;
  padding: 1em;
  border-radius: 12px;
  background-color: #111;
  color: #f5f5f5;
  margin: 0;
}
.messageContent :deep(.codeCopyButton){
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.14);
  color: #fff;
  transition: all 250ms ease;
}
.messageContent :deep(code){
  font-family: Consolas, Monaco, monospace;
}
.messageContent :deep(p){
  margin: 0.45em 0;
}
.messageContent :deep(ul),
.messageContent :deep(ol){
  padding: 0 0 0 1.2em;
  margin: 0.45em 0;
}
.messageContent :deep(li){
  margin: 0.2em 0;
}
.messageContent :deep(a){
  color: #8b0000;
  text-decoration: underline;
}
.messageContent :deep(blockquote){
  margin: 0.7em 0;
  padding-left: 1em;
  border-left: 4px solid rgba(0, 0, 0, 0.15);
  opacity: 0.9;
}
.messageContent :deep(h1),.messageContent :deep(h2),.messageContent :deep(h3),.messageContent :deep(h4){
  margin: 0.8em 0 0.45em;
  line-height: 1.35;
}
.messageContent :deep(table){
  width: 100%;
  border-collapse: collapse;
  margin: 0.8em 0;
  display: block;
  overflow-x: auto;
}
.messageContent :deep(th),.messageContent :deep(td){
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 0.6em 0.75em;
  text-align: left;
}
.iconButton{
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgb(255, 255, 255);
  color: #000000;
  font-size: 14px;
  transition: all 300ms ease;
}
.iconButton i{
  pointer-events: none;
}
.iconButton:active{
  transform: scale(0.9);
}
@keyframes blinkCursor{
  0%, 50%{
    opacity: 1;
  }
  50.01%, 100%{
    opacity: 0;
  }
}
@media(width > 768px){
  .messageActionButton:hover,.messageContent :deep(.codeCopyButton:hover){
    background-color: gold;
  }
  .iconButton:hover{
    background-color: gold;
    transform: translateY(-1px);
  }
}
</style>