<template>
  <aside class="conversationSidebar">
    <button
      type="button"
      class="newConversationButton"
      @click="chat.createNewConversation()"
    >
      + 新對話
    </button>
    <div class="conversationList">
      <button
        v-for="item in chat.conversations"
        :key="item.id"
        type="button"
        class="conversationItem"
        :class="{ active: item.id === chat.activeConversationId }"
        @click="chat.switchConversation(item.id)"
      >
        <div class="conversationInfo">
          <p class="conversationTitle">{{ item.title }}</p>
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
    </div>
  </aside>
</template>
<script setup lang="ts">
import { useChatStore } from "@/stores/chat.store";
const chat = useChatStore();
</script>
<style scoped>
.conversationSidebar{
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
.newConversationButton{
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
.conversationList{
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.conversationItem{
  width: 100%;
  border: 1px solid #dedede;
  border-radius: 12px;
  background-color: #fff;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: all ease 300ms;
}
.conversationItem.active{
  border-color: #8b0000;
  background-color: #fff5f5;
}

.conversationInfo{
  min-width: 0;
  flex: 1;
}
.conversationTitle{
  margin: 0 0 4px;
  font-weight: 700;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conversationMeta{
  margin: 0;
  font-size: 12px;
  color: #666;
}
.deleteButton{
  flex-shrink: 0;
  color: #666;
  cursor: pointer;
  line-height: 1;
  padding-top: 2px;
}
@media (width > 768px){
  .newConversationButton:hover:not(:disabled){
    background-color: #000;
    color: gold;
  }
  .conversationItem:hover:not(:disabled){
    border-color: #8b0000;
  }
}
</style>