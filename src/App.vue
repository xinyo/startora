<script setup lang="ts">
import Config from './components/config.vue'
import Main from './components/main.vue'
import { reactive } from 'vue';
const state = reactive({
  isConfigDialog: false
})
</script>

<template>
  <Main v-if="!state.isConfigDialog"></Main>
  <Config v-if="state.isConfigDialog" msg="Vite + Vue" />
  <button @click="state.isConfigDialog = !state.isConfigDialog">config</button>
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
</style>
