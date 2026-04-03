import { createApp } from 'vue'
import { createPinia } from "pinia";
import '@fortawesome/fontawesome-free/css/all.min.css'
import "highlight.js/styles/github-dark.css";
import './style/reset.css'
import App from './App.vue'
import { router } from "./router";

createApp(App).use(createPinia()).use(router).mount("#app");
