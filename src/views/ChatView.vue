<template>
  <main class="chatLayout">
    <button
      type="button"
      class="sidebarToggle"
      :class="{ isHidden: sidebarOpen }"
      @click="openSidebar"
      aria-label="開啟聊天室側欄"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <div
      class="sidebarOverlay"
      :class="{ isVisible: sidebarOpen }"
      @click="closeSidebar"
    ></div>
    <aside
      class="sidebarPanel"
      :class="{ isOpen: sidebarOpen }"
    >
      <ConversationSidebar @close-sidebar="closeSidebar" />
    </aside>
    <section class="artificialIntelligence">
      <header class="topBlock">
        <div class="titleRow">
          <div class="titleGroup">
            <h2 class="titleText">AI Chat Hub(MVP)</h2>
            <p class="providerText">目前Provider：{{ chat.provider }}</p>
            <p class="tokenText">目前對話Token：約{{ chat.totalTokens }}</p>
          </div>
        </div>
        <div class="allModel">
          <select v-model="chat.provider" class="model">
            <option value="mock">Mock</option>
            <option value="openai" disabled>OpenAI</option>
            <option value="groq">Groq</option>
            <option value="gemini" disabled>Gemini</option>
            <option value="perplexity" disabled>Perplexity</option>
          </select>
          <button
            type="button"
            @click="chat.createNewConversation()"
            class="newChat"
          >
            新對話
          </button>
        </div>
      </header>
      <section ref="conversationRef" class="conversation">
        <p v-if="chat.messages.length === 0" class="hint">
          目前使用 {{ chat.provider }} provider。
        </p>
        <div
          v-for="m in chat.messages"
          :key="m.id"
          class="messageRow"
          :class="{ isUser: m.role === 'user', isAssistant: m.role === 'assistant' }"
        >
          <div class="allMessage">
            <div class="messageBox">
              <span>{{ m.role === 'user' ? '你' : '機器人' }}</span>
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
              :can-regenerate="m.role === 'assistant' && !m.isStreaming && !chat.sending"
              @regenerate="handleRegenerate(m)"
            />
          </div>
        </div>
        <p v-if="chat.error" class="errorMessage">錯誤：{{ chat.error }}</p>
      </section>
      <footer class="user">
        <div class="inputWrapper">
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
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useChatStore } from "@/stores/chat.store";
import type { ChatMessage } from "@/types/chat";
import MessageContent from "@/components/chat/MessageContent.vue";
import ConversationSidebar from "@/components/chat/ConversationSidebar.vue";
const chat = useChatStore();
const input = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const conversationRef = ref<HTMLElement | null>(null);
const sidebarOpen = ref(false);
const isDesktop = ref(false);
const canSend = computed(() => input.value.trim().length > 0 && !chat.sending);
const canStop = computed(() => chat.sending);
function resizeTextarea(){
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = "auto";
  const maxHeight = 180;
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}
function scrollToBottom(smooth = true){
  const el = conversationRef.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}
function handleInput(){
  resizeTextarea();
}
function handleKeydown(e: KeyboardEvent){
  if (e.key !== "Enter") return;
  if (e.shiftKey) return;
  e.preventDefault();
  if(canStop.value){
    stopGenerating();
    return;
  }
  send();
}
function handleRegenerate(message: ChatMessage){
  if (message.role !== "assistant") return;
  chat.regenerateAssistantMessage?.(message.id);
}
async function send(){
  if (!canSend.value) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  resizeTextarea();
  await chat.sendUserText(text);
  await nextTick();
  scrollToBottom();
}
function stopGenerating(){
  if (!canStop.value) return;
  chat.stopGenerating();
}
function syncViewportState(){
  isDesktop.value = window.innerWidth > 768;
}
function openSidebar(){
  sidebarOpen.value = true;
}
function closeSidebar(){
  sidebarOpen.value = false;
}
watch(
  () => chat.messages.map(m => m.content).join('').length,
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
    if (!isDesktop.value){
      sidebarOpen.value = false;
    }
  }
);
onMounted(() => {
  resizeTextarea();
  scrollToBottom(false);
  syncViewportState();
  window.addEventListener("resize", syncViewportState);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", syncViewportState);
});
</script>
<style scoped>
.chatLayout{
  width: 100%;
  min-height: 100vh;
  position: relative;
  display: flex;
  background-color: #ffffff;
}
.sidebarToggle{
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 1200;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 12px;
  background-color: #111111;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 0 11px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}
.sidebarToggle span{
  display: block;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  background-color: #ffffff;
}
.sidebarToggle.isHidden{
  opacity: 0;
  pointer-events: none;
}
.sidebarOverlay{
  position: fixed;
  inset: 0;
  z-index: 1050;
  background-color: rgba(0, 0, 0, 0.38);
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms ease;
}
.sidebarOverlay.isVisible{
  opacity: 1;
  pointer-events: auto;
}
.sidebarPanel{
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1100;
  width: min(84vw, 300px);
  height: 100vh;
  background-color: #ffffff;
  box-shadow: 12px 0 30px rgba(0, 0, 0, 0.12);
  transform: translateX(-100%);
  transition: transform 300ms ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sidebarPanel.isOpen{
  transform: translateX(0);
}
.sidebarPanelHeader{
  display: flex;
  justify-content: flex-end;
  padding: 12px 12px 0;
  background-color: #fafafa;
  border-bottom: 1px solid #ececec;
}
.sidebarClose{
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  font-size: 20px;
  cursor: pointer;
}
.artificialIntelligence{
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 1.25em;
  padding: 4.5em 0 1.5em;
  transition: all ease 300ms;
}
.topBlock,.conversation,.user{
  width: min(92%, 1100px);
  margin: 0 auto;
}
.topBlock{
  display: flex;
  flex-flow: column nowrap;
  gap: 0.9em;
}
.titleRow{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1em;
}
.titleGroup{
  min-width: 0;
}
.titleText {
  margin: 0;
  font-size: 1.5rem;
}
.providerText,.tokenText{
  margin: 0.3em 0 0;
  opacity: 0.7;
}
.allModel{
  display: flex;
  flex-flow: row wrap;
  gap: 0.75em;
}
.model{
  min-height: 42px;
  background-color: #000000;
  color: #ffffff;
  padding: 0.5em 1em;
  border-radius: 8px;
}
.newChat{
  min-height: 42px;
  padding: 0.5em 1.25em;
  border: none;
  border-radius: 8px;
  background-color: #8b0000;
  color: #ffffff;
  transition: all ease 300ms;
}
.conversation{
  flex: 1;
  min-height: 50vh;
  overflow-y: auto;
  display: flex;
  flex-flow: column nowrap;
  gap: 1em;
  padding: 1em 0.25em 0.5em;
  scroll-behavior: smooth;
}
.hint{
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
.messageRow.isUser{
  justify-content: flex-end;
}
.messageRow.isAssistant{
  justify-content: flex-start;
}
.allMessage{
  max-width: 88%;
  padding: 0.9em 1em;
  border-radius: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.messageActions{
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
.messageActionButton{
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.08);
  color: inherit;
  transition: all 250ms ease;
}
.messageActionButton:disabled{
  cursor: not-allowed;
  opacity: 0.55;
}
.messageRow.isUser .allMessage{
  background-color: #8b0000;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}
.messageRow.isAssistant .allMessage{
  background-color: #f3f3f3;
  color: #222222;
  border-bottom-left-radius: 4px;
}
.messageBox{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  font-weight: 700;
}
.messageMeta{
  display: flex;
  gap: 0.5em;
  align-items: center;
  flex-wrap: wrap;
}
.messageToken,.messageTime{
  font-size: 0.75em;
  opacity: 0.7;
  font-weight: 400;
}
.errorMessage{
  color: #b00020;
  font-weight: 700;
  padding: 0.5em 0;
}
.user{
  position: sticky;
  bottom: 0;
  padding-bottom: max(0.5em, env(safe-area-inset-bottom));
  background:
    linear-gradient(to top, #ffffff 72%, rgba(255, 255, 255, 0));
}
.inputWrapper{
  position: relative;
  width: 100%;
}
.userText{
  width: 100%;
  min-height: 52px;
  max-height: 180px;
  line-height: 1.5;
  padding: 0.9em 5.5em 0.9em 1em;
  font-size: 1em;
  border-radius: 1em;
  border: 1px solid #d7d7d7;
  resize: none;
  overflow-y: hidden;
  box-sizing: border-box;
  outline: none;
  background-color: #ffffff;
}
.userText:focus{
  border-color: #8b0000;
}
.sendButton{
  position: absolute;
  right: 8px;
  bottom: 12px;
  padding: 0.55em 0.95em;
  color: #ffffff;
  background-color: #8b0000;
  border: none;
  border-radius: 10px;
  transition: all ease 300ms;
}
.sendButton:disabled{
  background-color: #c5c5c5;
  color: #474747;
  opacity: 0.7;
}
@media(width > 768px){
  .sidebarToggle{
    top: 18px;
    left: 18px;
  }
  .sidebarOverlay{
    display: none;
  }
  .sidebarPanel{
    width: 300px;
    box-shadow: none;
    border-right: 1px solid #ececec;
  }
  .sidebarPanelHeader{
    display: none;
  }
  .artificialIntelligence{
    margin: 0;
    padding: 2em 0;
    gap: 2em;
  }
  .sidebarPanel.isOpen ~ .artificialIntelligence{
    margin-left: 300px;
  }
  .conversation{
    min-height: 45vh;
    max-height: 58vh;
  }
  .allMessage{
    max-width: 70%;
  }
  .hint{
    font-size: 1.15em;
  }
  .newChat:hover:not(:disabled){
    color: gold;
    background-color: #000000;
  }
  .sendButton:hover:not(:disabled){
    color: gold;
    background-color: #000000;
  }
  .sidebarClose:hover {
    background-color: #efefef;
  }
  .messageActionButton:hover:not(:disabled){
    background-color: rgba(0, 0, 0, 0.16);
  }
}
</style>