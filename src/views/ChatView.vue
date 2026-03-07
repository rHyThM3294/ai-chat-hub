<template>
    <main class="artificialIntellengence">
        <header class="topBlock">
            <h2 class="titleText">AI Chat Hub(MVP)</h2>
            <p style="opacity:.6;">目前 Provider：{{ chat.provider }}</p>
            <div class="allModel">
                <select v-model="chat.provider" class="model">
                    <option value="mock">Mock</option>
                    <option value="openai" disabled>OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="gemini" disabled>Gemini</option>
                    <option value="perplexity" disabled>Perplexity</option>
                </select>
                <button type="button" @click="chat.resetConversation" class="newChat">新對話</button>
            </div>
        </header>
        <section class="conversation">
            <p v-if="chat.messages.length === 0" class="hint">先輸入一句話測試(目前用 Mock provider)。</p>
            <div v-for="m in chat.messages" :key="m.id" class="allMessage">
                <div class="messageBox">
                    {{ m.role === 'user' ? '你' : (m.role === 'assistant' ? '機器人' : 'system') }}
                    <span class="">{{ new Date(m.createdAt).toLocaleTimeString() }}</span>
                </div>
                <div class="">{{ m.content }}</div>
            </div>
            <p v-if="chat.error" class="errorMessage">錯誤：{{ chat.error }}</p>
        </section>
        <footer class="user">
            <div class="inputWrapper">
                <input
                class="userText"
                v-model="input"
                @keydown.enter.exact.prevent="send"
                :disabled="chat.sending"
                placeholder="輸入訊息，Enter送出"
                />

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
    </main>
</template>
<script setup lang="ts">
    import{ computed, ref } from "vue";
    import { useChatStore } from "@/stores/chat.store";
    const chat = useChatStore();
    const input = ref("");
    const canSend = computed(() => !chat.sending && input.value.trim().length > 0);
    async function send(){
        if(!canSend.value) return;
        const text = input.value;
        input.value = "";
        await chat.sendUserText(text);
    }
</script>
<style scoped>
.artificialIntellengence{
    width: 100%;
    min-height: 100vh;
    padding: 2em 0;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    gap: 4em;
}
.topBlock{}
.allModel{
    display: flex;
    flex-flow: row nowrap;
    gap: 1.5em;
}
.model{
    background-color: #000000;
    color: #FFFFFF;
    padding: 0.5em 1em;
}
.newChat{
    padding: 0.5em 1.5em;
    border-radius: 8px;
    background-color: #8b0000;
    color: #FFFFFF;
    transition: all ease 300ms;
}
.hint{
    font-size: 1.5em;
    font-weight: 700;
    color: #ff93fd;
}
.conversation{
    width: 100%;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
}

.allMessage{
    width: 90%;
    display: flex;
    flex-flow: column nowrap;
    gap: 0.8em;
}
.user{
    width:100%;
    display:flex;
    justify-content:center;
}
.inputWrapper{
    position:relative;
    width:90%;
    max-width:1000px;
}
.userText{
    width:100%;
    line-height:1.5;
    padding:0.75em 3.5em 0.75em 1em;
    font-size:16px;
    border-radius:8px;
}
.enterButton{
    position:absolute;
    right:6px;
    top:50%;
    transform:translateY(-50%);
    padding:0.4em 0.8em;
    color:#ffffff;
    background-color:#8b0000;
    border-radius:6px;
    transition:all ease 300ms;
    &:disabled{
        background-color: #c5c5c5;
        color: #474747;
        opacity: 0.7;
    }
}




@media(width>768px){
    .artificialIntellengence{}
    .topBlock{}
    .allModel{}
    .model{}
    .newChat:hover:not(:disabled){
        color: gold;
        background-color: #000000;
    }
    .hint{}
    .allMessage{
        max-width: 1200px;
    }
    .userText{}
    .enterButton:hover:not(:disabled){
        color: gold;
        background-color: #000000;
    }
}
</style>