import { createApp } from "vue";
import { createPinia } from "pinia";
import naiveUI from "naive-ui";
import "./style.css";
import App from "./App.vue";

const pinia = createPinia();
createApp(App).use(pinia).use(naiveUI).mount("#app");
