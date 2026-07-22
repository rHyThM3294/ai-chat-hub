<template>
  <footer class="user">
    <div v-if="pendingImages.length > 0" class="pendingImages">
      <div v-for="img in pendingImages" :key="img.id" class="pendingImageItem">
        <img :src="img.dataUrl" :alt="img.name" />
        <button
          type="button"
          class="removeImageButton"
          aria-label="移除圖片"
          @click="removeImage(img.id)"
        >
          ✕
        </button>
      </div>
    </div>
    <p v-if="imageError" class="errorMessage">{{ imageError }}</p>
    <div class="inputWrapper">
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="handleFileChange"
      />
      <button
        type="button"
        class="attachButton"
        aria-label="上傳圖片"
        :disabled="chat.sending"
        @click="fileInputRef?.click()"
      >
        <i class="fa-solid fa-paperclip"></i>
      </button>
      <textarea
        ref="textareaRef"
        v-model="input"
        class="userText"
        :disabled="chat.sending"
        rows="1"
        enterkeyhint="send"
        autocomplete="off"
        autocapitalize="sentences"
        spellcheck="true"
        placeholder="輸入訊息"
        aria-label="輸入訊息"
        @input="handleInput"
        @keydown="handleKeydown"
      ></textarea>
      <button
        type="button"
        class="sendButton"
        :disabled="!canSend && !canStop"
        @click="canStop ? stopGenerating() : send()"
      >
        {{ chat.sending ? "停止生成" : "送出" }}
      </button>
    </div>
  </footer>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useChatStore } from "@/stores/chat.store";
import { uid } from "@/types/chat";
import type { ChatImageAttachment } from "@/types/chat";

const chat = useChatStore();
const input = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingImages = ref<ChatImageAttachment[]>([]);
const imageError = ref<string | null>(null);
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const canSend = computed(() => input.value.trim().length > 0 && !chat.sending);
const canStop = computed(() => chat.sending);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  target.value = "";
  imageError.value = null;
  for (const file of files) {
    if (pendingImages.value.length >= MAX_IMAGES) {
      imageError.value = `最多只能附加 ${MAX_IMAGES} 張圖片`;
      break;
    }
    if (!file.type.startsWith("image/")) {
      imageError.value = "只能上傳圖片檔案";
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      imageError.value = `「${file.name}」超過 3MB 上限`;
      continue;
    }
    const dataUrl = await fileToDataUrl(file);
    pendingImages.value.push({ id: uid("img"), name: file.name, dataUrl });
  }
}
function removeImage(id: string) {
  pendingImages.value = pendingImages.value.filter((img) => img.id !== id);
}
function resizeTextarea() {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  const maxHeight = 180;
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}
function handleInput() {
  resizeTextarea();
}
function handleKeydown(e: KeyboardEvent) {
  if (e.key !== "Enter") return;
  if (e.shiftKey) return;
  e.preventDefault();
  if (canStop.value) {
    stopGenerating();
    return;
  }
  send();
}
async function send() {
  if (!canSend.value) return;
  const text = input.value.trim();
  if (!text) return;
  const images = pendingImages.value;
  input.value = "";
  pendingImages.value = [];
  resizeTextarea();
  await chat.sendUserText(text, images);
}
function stopGenerating() {
  if (!canStop.value) return;
  chat.stopGenerating();
}
onMounted(() => {
  resizeTextarea();
});
</script>
<style scoped>
.errorMessage {
  color: var(--color-error);
  font-weight: 700;
  padding: 0.5em 0;
}
.user {
  width: min(92%, 1100px);
  margin: 0 auto;
  position: sticky;
  bottom: 0;
  padding-bottom: max(0.5em, env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--color-bg) 72%, transparent);
}
.pendingImages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.pendingImageItem {
  position: relative;
  width: 64px;
  height: 64px;
}
.pendingImageItem img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}
.removeImageButton {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background-color: var(--color-accent);
  color: #ffffff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.inputWrapper {
  position: relative;
  width: 100%;
}
.attachButton {
  position: absolute;
  left: 8px;
  bottom: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  color: var(--color-text-muted);
  transition: all ease 300ms;
}
.attachButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.userText {
  width: 100%;
  min-height: 52px;
  max-height: 180px;
  line-height: 1.5;
  padding: 0.9em 5.5em 0.9em 2.75em;
  font-size: 1em;
  border-radius: 1em;
  border: 1px solid var(--color-border);
  resize: none;
  overflow-y: hidden;
  box-sizing: border-box;
  outline: none;
  background-color: var(--color-surface);
  color: var(--color-text);
}
.userText:focus {
  border-color: var(--color-accent);
}
.sendButton {
  position: absolute;
  right: 8px;
  bottom: 12px;
  padding: 0.55em 0.95em;
  color: var(--color-accent-contrast);
  background-color: var(--color-accent);
  border: none;
  border-radius: 10px;
  transition: all ease 300ms;
}
.sendButton:disabled {
  background-color: #c5c5c5;
  color: #474747;
  opacity: 0.7;
}
@media (width > 768px) {
  .attachButton:hover:not(:disabled) {
    background-color: var(--color-hover-surface);
    color: var(--color-text);
  }
  .sendButton:hover:not(:disabled) {
    color: gold;
    background-color: #000000;
  }
}
</style>
