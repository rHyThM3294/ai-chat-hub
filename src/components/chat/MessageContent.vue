<template>
    <div 
        class="messageContent markdownBody"
        :class="{ isStreaming }"
        v-html="html"
    ></div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '@/utils/renderMarkdown';
const props = defineProps<{
    content:string;
    isStreaming?:boolean;
}>();
const html = computed(() => renderMarkdown(props.content));
</script>
<style scoped>
.messageContent{
    white-space: normal;
    word-break: break-word;
    line-height: 1.7;
}
.messageContent :deep(pre){
    overflow-x: auto;
    padding: 1em;
    border-radius: 12px;
    background-color: #111;
    color: #f5f5f5;
}
.messageContent :deep(code){
    font-family: Consolas, Monaco, monospace;
}
.messageContent :deep(p){
    margin: 0.45em 0;
}
.messageContent :deep(ul),.messageContent :deep(ol){
    padding:0 0 0 1.2em;
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
@keyframes blinkCursor{
    0%, 50%{
        opacity: 1;
    }
    50.01%, 100%{
        opacity: 0;
    }
}
</style>