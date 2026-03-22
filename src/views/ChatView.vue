<template>
  <main class="chatLayout">
    <ConversationSidebar />
    <section class="artificialIntelligence">
      <header class="topBlock">
        <h2 class="titleText">AI Chat Hub(MVP)</h2>
        <p class="providerText">目前Provider：{{ chat.provider }}</p>
        <p class="tokenText">目前對話Token：約{{ chat.totalTokens }}</p>
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
            class="enterButton"
            :disabled="!canSend"
            @click="send"
          >
            {{ chat.sending ? "送出中...." : "送出" }}
          </button>
        </div>
      </footer>
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useChatStore } from "@/stores/chat.store";
import MessageContent from "@/components/chat/MessageContent.vue";
import ConversationSidebar from "@/components/chat/ConversationSidebar.vue";
const chat = useChatStore();
const input = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const conversationRef = ref<HTMLElement | null>(null);
const canSend = computed(() => !chat.sending && input.value.trim().length > 0);
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
  if (e.key === "Enter" && e.shiftKey) return;
  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    send();
  }
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
watch(
  () => chat.messages,
  async () => {
    await nextTick();
    scrollToBottom();
  },
  { deep: true }
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
  resizeTextarea();
  scrollToBottom(false);
});
</script>
<style scoped>
.chatLayout{
  width: 100%;
  min-height: 100vh;
  display: flex;
  background-color: #ffffff;
}
.artificialIntelligence{
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 2em;
  padding: 2em 0;
}
.topBlock{
  width: 92%;
  max-width: 1100px;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.75em;
}
.titleText{
  margin: 0;
}
.providerText,.tokenText{
  opacity: 0.7;
  margin: 0;
}
.allModel{
  display: flex;
  flex-flow: row wrap;
  gap: 1em;
}
.model{
  background-color: #000000;
  color: #ffffff;
  padding: 0.5em 1em;
  border-radius: 8px;
}
.newChat{
  padding: 0.5em 1.5em;
  border-radius: 8px;
  background-color: #8b0000;
  color: #ffffff;
  transition: all ease 300ms;
}
.conversation{
  width: 92%;
  max-width: 1100px;
  flex: 1;
  min-height: 45vh;
  max-height: 58vh;
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
.messageRow{
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
  max-width: 70%;
  padding: 0.9em 1em;
  border-radius: 1em;
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.messageRow.isUser .allMessage{
  background-color: #8b0000;
  color: white;
  border-bottom-right-radius: 4px;
}
.messageRow.isAssistant .allMessage{
  background-color: #f3f3f3;
  color: #222;
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
  width: 92%;
  max-width: 1100px;
  position: sticky;
  bottom: 0;
  padding-bottom: max(0.5em, env(safe-area-inset-bottom));
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
}
.userText:focus{
  border-color: #8b0000;
}
.enterButton{
  position: absolute;
  right: 8px;
  bottom: 12px;
  padding: 0.55em 0.95em;
  color: #ffffff;
  background-color: #8b0000;
  border-radius: 10px;
  transition: all ease 300ms;
}
.enterButton:disabled{
  background-color: #c5c5c5;
  color: #474747;
  opacity: 0.7;
}
.topBlock,.conversation,.user{
  width: 92%;
  max-width: 1100px;
  margin: 0 auto;
}
@media (width <= 768px){
  .chatLayout{
    flex-direction: column;
  }
  .artificialIntelligence{
    padding: 1.5em 0;
  }
  .allMessage{
    max-width: 88%;
  }
  .conversation{
    max-height: none;
    min-height: 50vh;
  }
}
@media(width > 768px){
  .hint{
    font-size: 1.15em;
  }
  .newChat:hover:not(:disabled){
    color: gold;
    background-color: #000000;
  }
  .enterButton:hover:not(:disabled){
    color: gold;
    background-color: #000000;
  }
}
</style>