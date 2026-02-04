<script setup lang="ts">
import { onMounted, ref } from "vue";
import logo from "../assets/logo-group.svg";
import Config from "../components/config.vue";
import Main from "../components/main.vue";
import { useStore } from "../store";

const isConfigDialog = ref(false);
const appName = ref("");
const appUrl = ref("http://");

const store = useStore();

const addApp = async () => {
  if (appName.value && appUrl.value) {
    const data = await store.addUserApp(appName.value, {
      url: appUrl.value,
    });
    if (data) {
      appName.value = "";
      appUrl.value = "http://";
    }
  } else {
    console.error("App name and URL are required");
  }
};

onMounted(async () => {
  await store.init();
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
        <input type="text" v-model="appName" placeholder="App Name" />
        <input type="text" v-model="appUrl" placeholder="App URL" />
        <button @click="store.initApps">init apps</button>
        <button @click="addApp()">add app</button>
      </div>
      <n-modal-provider>
        <Main v-if="!isConfigDialog"></Main>
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
