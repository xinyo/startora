<script lang="ts" setup>
import { useStore } from "@/client/store";
const title = "general";
const store = useStore();
</script>
<template>
  <div>{{ title }}</div>
  <div>{{ store.session.id }}</div>
</template>
