<script setup lang="ts">
import { onMounted, ref } from "vue";
import logo from "../assets/logo-group.svg";
import Config from "../components/config.vue";
import Main from "../components/main.vue";
import { useStore } from "../store";

const isConfigDialog = ref(false);
const mainRef = ref<{ openCreateAppModal: () => void } | null>(null);

const store = useStore();

onMounted(async () => {
  await store.ensureInitialized();
  await store.initApps();
});
</script>

<template>
  <div>
    <div class="config">
      <button @click="isConfigDialog = !isConfigDialog"> config </button>
    </div>
    <n-message-provider placement="bottom">
      <img :src="logo" />
      <div>
        <button @click="mainRef?.openCreateAppModal()">add app</button>
      </div>
      <n-modal-provider>
        <Main v-if="!isConfigDialog" ref="mainRef"></Main>
        <Config v-if="isConfigDialog" />
      </n-modal-provider>
    </n-message-provider>
  </div>
</template>

<style scoped>
.config {
  position: fixed;
  top: 15px;
  right: 15px;
  z-index: 10;
}
</style>
