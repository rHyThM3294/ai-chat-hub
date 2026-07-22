<template>
  <main class="chatLayout">
    <button
      type="button"
      class="sidebarToggle"
      :class="{ isHidden: sidebarOpen }"
      aria-label="開啟聊天室側欄"
      @click="openSidebar"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <div class="sidebarOverlay" :class="{ isVisible: sidebarOpen }" @click="closeSidebar"></div>
    <aside class="sidebarPanel" :class="{ isOpen: sidebarOpen }">
      <ConversationSidebar @close-sidebar="closeSidebar" />
    </aside>
    <section class="artificialIntelligence">
      <ChatHeader />
      <ErrorBanner />
      <MessageList />
      <ChatInputBar />
    </section>
  </main>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useChatStore } from "@/stores/chat.store";
import ConversationSidebar from "@/components/chat/ConversationSidebar.vue";
import ChatHeader from "@/components/chat/ChatHeader.vue";
import ErrorBanner from "@/components/chat/ErrorBanner.vue";
import MessageList from "@/components/chat/MessageList.vue";
import ChatInputBar from "@/components/chat/ChatInputBar.vue";

const chat = useChatStore();
const sidebarOpen = ref(false);
const isDesktop = ref(false);

function syncViewportState() {
  isDesktop.value = window.innerWidth > 768;
}
function openSidebar() {
  sidebarOpen.value = true;
}
function closeSidebar() {
  sidebarOpen.value = false;
}
function handleWindowKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && sidebarOpen.value) {
    closeSidebar();
  }
}
watch(
  () => chat.activeConversationId,
  () => {
    if (!isDesktop.value) {
      sidebarOpen.value = false;
    }
  }
);
onMounted(() => {
  syncViewportState();
  window.addEventListener("resize", syncViewportState);
  window.addEventListener("keydown", handleWindowKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", syncViewportState);
  window.removeEventListener("keydown", handleWindowKeydown);
});
</script>
<style scoped>
.chatLayout {
  width: 100%;
  min-height: 100vh;
  position: relative;
  display: flex;
  background-color: var(--color-bg);
  color: var(--color-text);
}
.sidebarToggle {
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
.sidebarToggle span {
  display: block;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  background-color: #ffffff;
}
.sidebarToggle.isHidden {
  opacity: 0;
  pointer-events: none;
}
.sidebarOverlay {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background-color: rgba(0, 0, 0, 0.38);
  opacity: 0;
  pointer-events: none;
  transition: opacity 300ms ease;
}
.sidebarOverlay.isVisible {
  opacity: 1;
  pointer-events: auto;
}
.sidebarPanel {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1100;
  width: min(84vw, 300px);
  height: 100vh;
  background-color: var(--color-surface);
  box-shadow: 12px 0 30px rgba(0, 0, 0, 0.12);
  transform: translateX(-100%);
  transition: transform 300ms ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sidebarPanel.isOpen {
  transform: translateX(0);
}
.artificialIntelligence {
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
@media (width > 768px) {
  .sidebarToggle {
    top: 18px;
    left: 18px;
  }
  .sidebarOverlay {
    display: none;
  }
  .sidebarPanel {
    width: 300px;
    box-shadow: none;
    border-right: 1px solid var(--color-border);
  }
  .artificialIntelligence {
    margin: 0;
    padding: 2em 0;
    gap: 2em;
  }
  .sidebarPanel.isOpen ~ .artificialIntelligence {
    margin-left: 300px;
  }
}
</style>
