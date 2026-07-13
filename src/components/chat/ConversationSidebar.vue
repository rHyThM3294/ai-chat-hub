<template>
  <aside class="conversationSidebar">
    <div class="sidebarTopBar">
      <p class="sidebarTitle">聊天室</p>
      <button
        type="button"
        class="sidebarCloseButton"
        aria-label="關閉聊天室側欄"
        @click="$emit('close-sidebar')"
      >
        ✕
      </button>
    </div>
    <button type="button" class="newConversationButton" @click="chat.createNewConversation()">
      + 新對話
    </button>
    <div class="searchWrapper">
      <input
        v-model="searchText"
        type="text"
        class="searchInput"
        placeholder="搜尋聊天室"
        aria-label="搜尋聊天室"
      />
    </div>
    <div class="conversationList" role="listbox" aria-label="對話清單">
      <div
        v-for="item in filteredConversations"
        :key="item.id"
        class="conversationItem"
        :class="{ active: item.id === chat.activeConversationId }"
        role="option"
        tabindex="0"
        :aria-selected="item.id === chat.activeConversationId"
        @click="handleSelect(item.id)"
        @keydown.enter="handleSelect(item.id)"
        @keydown.space.prevent="handleSelect(item.id)"
      >
        <div class="conversationInfo">
          <template v-if="editingId === item.id">
            <input
              ref="editingInputRef"
              v-model="editingTitle"
              class="conversationTitleInput"
              type="text"
              maxlength="40"
              aria-label="編輯聊天室名稱"
              @click.stop
              @dblclick.stop
              @keydown.enter.prevent.stop="saveEditing(item.id)"
              @keydown.esc.prevent.stop="cancelEditing"
              @blur="saveEditing(item.id)"
            />
          </template>
          <template v-else>
            <p
              class="conversationTitle"
              title="雙擊可修改名稱"
              @dblclick.stop="startEditing(item.id, item.title)"
            >
              {{ item.title }}
            </p>
          </template>
          <p class="conversationMeta">
            {{ item.provider }} ・ {{ item.messages.length }} 則訊息 ・
            {{ formatTime(item.updatedAt) }}
          </p>
        </div>
        <button
          type="button"
          class="deleteButton"
          aria-label="刪除這個對話"
          @click.stop="chat.deleteConversation(item.id)"
        >
          ✕
        </button>
      </div>
      <p v-if="filteredConversations.length === 0" class="emptySearchText">找不到符合的聊天室</p>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useChatStore } from "@/stores/chat.store";
defineEmits<{
  (e: "close-sidebar"): void;
}>();
const chat = useChatStore();
const editingId = ref<string | null>(null);
const editingTitle = ref("");
const editingInputRef = ref<HTMLInputElement | null>(null);
const searchText = ref("");
const filteredConversations = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  const sortedConversations = [...chat.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!keyword) return sortedConversations;
  return sortedConversations.filter((item) => {
    return (
      item.title.toLowerCase().includes(keyword) || item.provider.toLowerCase().includes(keyword)
    );
  });
});
function handleSelect(id: string) {
  if (editingId.value) return;
  chat.switchConversation(id);
}
async function startEditing(id: string, title: string) {
  editingId.value = id;
  editingTitle.value = title;
  await nextTick();
  editingInputRef.value?.focus();
  editingInputRef.value?.select();
}
function saveEditing(id: string) {
  if (editingId.value !== id) return;
  chat.renameConversation(id, editingTitle.value);
  editingId.value = null;
  editingTitle.value = "";
}
function cancelEditing() {
  editingId.value = null;
  editingTitle.value = "";
}
function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>
<style scoped>
.conversationSidebar {
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
  box-sizing: border-box;
  background-color: var(--color-bg-elevated);
  color: var(--color-text);
}
.sidebarTopBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sidebarTitle {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text);
}
.sidebarCloseButton {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  color: var(--color-text);
  font-size: 20px;
  cursor: pointer;
  transition: all ease 300ms;
}
.newConversationButton {
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: 12px;
  padding: 12px;
  background-color: var(--color-accent);
  color: var(--color-accent-contrast);
  cursor: pointer;
  transition: all ease 300ms;
}
.searchWrapper {
  width: 100%;
}
.searchInput {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background-color: var(--color-surface);
  color: var(--color-text);
  box-sizing: border-box;
  outline: none;
}
.searchInput:focus {
  border-color: var(--color-accent);
}
.conversationList {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 2px 0;
}
.conversationItem {
  position: relative;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background-color: var(--color-surface);
  color: var(--color-text);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 250ms ease,
    background-color 250ms ease,
    box-shadow 250ms ease,
    transform 250ms ease;
}
.conversationItem.active {
  border-color: var(--color-accent);
  background: linear-gradient(
    180deg,
    var(--color-accent-soft-1) 0%,
    var(--color-accent-soft-2) 100%
  );
  box-shadow:
    0 10px 24px rgba(139, 0, 0, 0.08),
    inset 3px 0 0 var(--color-accent);
}
.conversationInfo {
  min-width: 0;
  flex: 1;
}
.conversationTitle {
  margin: 0 0 4px;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}
.conversationTitleInput {
  width: 100%;
  margin: 0 0 4px;
  padding: 6px 8px;
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  background-color: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 700;
  outline: none;
  box-sizing: border-box;
}

.conversationMeta {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.deleteButton {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: var(--color-text-muted);
  cursor: pointer;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translateY(2px);
  transition:
    opacity 220ms ease,
    transform 220ms ease,
    background-color 220ms ease,
    color 220ms ease;
}

.conversationItem.active .deleteButton {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.emptySearchText {
  margin: 16px 0 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (width > 768px) {
  .newConversationButton:hover:not(:disabled) {
    background-color: #000;
    color: gold;
  }

  .sidebarCloseButton:hover {
    background-color: var(--color-hover-surface);
  }

  .conversationItem:hover {
    border-color: #8b0000;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .conversationItem:hover .deleteButton {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .deleteButton:hover {
    background-color: #f3dede;
    color: #8b0000;
  }
}
</style>
