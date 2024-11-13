<script setup lang="ts">
import { watch } from "vue";
import Config from "./components/config.vue";
import Main from "./components/main.vue";
import { reactive } from "vue";
import { useStore } from "./store";
const state = reactive({
  isConfigDialog: false,
  debug: false,
});
const store = useStore();
watch(
  () => store.theme,
  (newTheme) => {
    // Update the :root CSS variables when the theme changes
    document.documentElement.style.setProperty(
      "--background-primary",
      newTheme.background
    );
    document.documentElement.style.setProperty(
      "--txt-primary",
      newTheme.primary
    );
    document.documentElement.style.setProperty("--accent", newTheme.accent);
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <pre v-if="state.debug" class="debug">{{ store }}</pre>
    <Main v-if="!state.isConfigDialog"></Main>
    <Config v-if="state.isConfigDialog" msg="Vite + Vue" />

    <button @click="state.isConfigDialog = !state.isConfigDialog">
      config
    </button>
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.debug {
  position: fixed;
  right: 0;
  top: 0;
}
</style>
