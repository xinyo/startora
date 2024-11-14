<script setup lang="ts">
import Config from "./components/config.vue";
import Main from "./components/main.vue";
import * as API from "../server/api";
import { ref, reactive, onMounted, computed } from "vue";
import { useStore } from "./store";
import logo from "./assets/logo-group.svg";

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
    <img :src="logo" />
    <div>users</div>
    <li v-for="user in users" :key="user.id">
      {{ user.name }} - {{ user.email }}
    </li>
    <input type="text" v-model="state.userName" placeholder="name" />
    <input type="email" v-model="state.userEmail" placeholder="email" />
    <button @click="createUser">create user</button>
    <button @click="getUsers">get user</button>
    <pre v-if="state.debug" class="debug">{{ store }}</pre>
    <Main v-if="!state.isConfigDialog"></Main>
    <Config v-if="state.isConfigDialog" msg="Vite + Vue" />

    <button @click="state.isConfigDialog = !state.isConfigDialog">
      config
    </button>
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
