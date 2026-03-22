<template>
  <aside class="conversationSidebar">
    <div class="sidebarTopBar">
      <p class="sidebarTitle">聊天室</p>

      <button
        type="button"
        class="sidebarCloseButton"
        @click="$emit('close-sidebar')"
        aria-label="關閉聊天室側欄"
      >
        ✕
      </button>
    </div>

    <button
      type="button"
      class="newConversationButton"
      @click="chat.createNewConversation()"
    >
      + 新對話
    </button>

    <div class="searchWrapper">
      <input
        v-model="searchText"
        type="text"
        class="searchInput"
        placeholder="搜尋聊天室"
      />
    </div>

    <div class="conversationList">
      <button
        v-for="item in filteredConversations"
        :key="item.id"
        type="button"
        class="conversationItem"
        :class="{ active: item.id === chat.activeConversationId }"
        @click="handleSelect(item.id)"
      >
        <div class="conversationInfo">
          <template v-if="editingId === item.id">
            <input
              ref="editingInputRef"
              v-model="editingTitle"
              class="conversationTitleInput"
              type="text"
              maxlength="40"
              @click.stop
              @dblclick.stop
              @keydown.enter.prevent="saveEditing(item.id)"
              @keydown.esc.prevent="cancelEditing"
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
            {{ item.provider }} ・ {{ item.messages.length }} 則訊息
          </p>
        </div>

        <span
          class="deleteButton"
          @click.stop="chat.deleteConversation(item.id)"
        >
          ✕
        </span>
      </button>

      <p
        v-if="filteredConversations.length === 0"
        class="emptySearchText"
      >
        找不到符合的聊天室
      </p>
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
  if (!keyword) return chat.conversations;

  return chat.conversations.filter((item) => {
    return (
      item.title.toLowerCase().includes(keyword) ||
      item.provider.toLowerCase().includes(keyword)
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
  background-color: #fafafa;
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
  color: #222;
}

.sidebarCloseButton {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  color: #333;
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
  background-color: #8b0000;
  color: #fff;
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
  border: 1px solid #d7d7d7;
  border-radius: 10px;
  background-color: #fff;
  color: #222;
  box-sizing: border-box;
  outline: none;
}

.searchInput:focus {
  border-color: #8b0000;
}

.conversationList {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.conversationItem {
  position: relative;
  width: 100%;
  border: 1px solid #dedede;
  border-radius: 14px;
  background-color: #fff;
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
  border-color: #8b0000;
  background:
    linear-gradient(180deg, #fff8f8 0%, #fff2f2 100%);
  box-shadow:
    0 10px 24px rgba(139, 0, 0, 0.08),
    inset 3px 0 0 #8b0000;
}

.conversationInfo {
  min-width: 0;
  flex: 1;
}

.conversationTitle {
  margin: 0 0 4px;
  font-weight: 700;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.conversationTitleInput {
  width: 100%;
  margin: 0 0 4px;
  padding: 6px 8px;
  border: 1px solid #8b0000;
  border-radius: 8px;
  background-color: #fff;
  color: #222;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  box-sizing: border-box;
}

.conversationMeta {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.deleteButton {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #666;
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
  color: #777;
  font-size: 14px;
}

@media (width > 768px) {
  .newConversationButton:hover:not(:disabled) {
    background-color: #000;
    color: gold;
  }

  .sidebarCloseButton:hover {
    background-color: #efefef;
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