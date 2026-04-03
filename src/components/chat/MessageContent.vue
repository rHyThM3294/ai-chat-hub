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
        v-if="role === 'user' && canEdit"
        type="button"
        class="messageActionButton"
        @click="emit('edit')"
        title="編輯訊息"
      >
        <i class="fa-solid fa-pen"></i>
      </button>
      <button
        v-if="role === 'assistant' && canRegenerate"
        type="button"
        class="iconButton"
        @click="emit('regenerate')"
        title="重新生成"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>
    </div>
    <div
      ref="contentRef"
      class="messageContent markdownBody"
      :class="{ isStreaming }"
      v-html="html"
    ></div>
  </div>
</template>
<script setup lang="ts">
import{ computed, nextTick, onBeforeUnmount, ref ,watch }from "vue";
import { renderMarkdown } from "@/utils/renderMarkdown";
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
const html = computed(() => renderMarkdown(props.content));
const contentRef = ref<HTMLElement | null>(null);
const messageCopied = ref(false);
let messageCopyTimer:number | null = null;
function resetMessageCopyState(){
  if(messageCopyTimer){
    window.clearTimeout(messageCopyTimer);
    messageCopyTimer = null;
  }
  messageCopied.value = false;
}
async function copyMessage(){
  try{
    await navigator.clipboard.writeText(props.content ?? "");
    messageCopied.value = true;
    if(messageCopyTimer){
      window.clearTimeout(messageCopyTimer);
    }
    messageCopyTimer = window.setTimeout(() => {
      messageCopied.value = false;
      messageCopyTimer = null;
    },1500);
  }catch(error){
    console.error("複製訊息失敗：",error);
  }
}
function enhanceCodeBlocks(){
  const root = contentRef.value;
  if(!root)return;
  const preList = root.querySelectorAll("pre");
  preList.forEach((pre) => {
    if(pre.parentElement?.classList.contains("codeBlockWrapper"))return;
    const wrapper = document.createElement("div");
    wrapper.className = "codeBlockWrapper";
    const button = document.createElement("button");
    button.className = "codeCopyButton";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click",async() => {
      const codeText = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      try{
        await navigator.clipboard.writeText(codeText);
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = "Copy";
        },1200);
      }catch{
        button.textContent = "Failed";
        window.setTimeout(() => {
          button.textContent = "Copy";
        },1200);
      }
    });
    const parent = pre.parentNode;
    if(!parent)return;
    parent.insertBefore(wrapper, pre);
    wrapper.appendChild(button);
    wrapper.appendChild(pre);
  });
}
watch(
  html,
  async() => {
    await nextTick();
    enhanceCodeBlocks();
  },
  { immediate: true }
);
onBeforeUnmount(() => {
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
  background-color:#ffffff;
  color: #000000;
  transition: all 300ms ease;
}
.messageContent{
  white-space: normal;
  word-break: break-word;
  line-height: 1.7;
}
.messageContent :deep(.codeBlockWrapper){
  position: relative;
}
.messageContent :deep(pre) {
  overflow-x: auto;
  padding: 1em;
  border-radius: 12px;
  background-color: #111;
  color: #f5f5f5;
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
}
.messageContent :deep(a){
  color: #8b0000;
  text-decoration: underline;
}
.messageContent.isStreaming::after{
  content: "";
  display: inline-block;
  width: 0.5em;
  height: 1.1em;
  margin: 0 0 0 0.15em;
  vertical-align: text-bottom;
  background-color: currentColor;
  animation: blinkCursor 0.9s steps(1) infinite;
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
    background-color:gold;
    transform: translateY(-1px);
  }
}
</style>