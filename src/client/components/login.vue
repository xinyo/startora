<script lang="ts" setup></script>
<template>
  <input type="text" v-model="state.userName" placeholder="name" />
  <input type="email" v-model="state.userEmail" placeholder="email" />
  <button @click="createUser">create user</button>
  <button @click="getUsers">get user</button>
</template>
