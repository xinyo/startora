<script setup lang="ts">
import Config from "./components/config.vue";
import Main from "./components/main.vue";
import * as API from "../server/api";
import { ref, reactive, onMounted, computed } from "vue";
import { useStore } from "./store";
import logo from "./assets/logo-group.svg";
// import { useMessage } from "naive-ui";

interface User {
  id: number;
  name: string;
  email: string;
}

const state = reactive({
  isConfigDialog: false,
  debug: true,
  userName: "",
  userEmail: "",
});
const store = useStore();
const users = ref<User[]>([]);
// window.$message = useMessage();

const createUser = async () => {
  await API.addUser(state.userName, state.userEmail);
};

const getUsers = async () => {
  users.value = await API.getUsers();
};

onMounted(async () => {
  await getUsers();
});
</script>

<template>
  <div>
    <n-message-provider>
      <img :src="logo" />

      <pre v-if="state.debug" class="debug">{{ store }}</pre>
      <Main v-if="!state.isConfigDialog"></Main>
      <Config v-if="state.isConfigDialog" msg="Vite + Vue" />

      <button @click="state.isConfigDialog = !state.isConfigDialog">
        config
      </button>
    </n-message-provider>
  </div>
</template>

<style scoped>
.debug {
  position: fixed;
  right: 0;
  top: 0;
  background: wheat;
  text-align: left;
  padding: 2em;
}
</style>
