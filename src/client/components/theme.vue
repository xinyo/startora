<script lang="ts" setup>
import { colors } from "@/client/definition";
import { NCard, useMessage } from "naive-ui";
import { useStore } from "../store/index";
import type { Theme } from "../types/store";


const store = useStore();
const message = useMessage();

const emitTheme = async (color: Theme) => {
  const { name, ...data } = color;
  document.documentElement.style.setProperty(
    "--background-primary",
    data.background
  );
  document.documentElement.style.setProperty("--txt-primary", data.primary);
  document.documentElement.style.setProperty("--accent", data.accent);
  await store.updateTheme(data);
  message.success(`Theme updated ${name}`, { duration: 3000 });
};
</script>

<template>
  <h2>theme</h2>
  <div class="theme-container">
    <n-card class="colors" v-for="color in colors" @click="emitTheme(color)">
      <div class="color-option">
        <div :style="{ 'background-color': color.primary }"></div>
        <div :style="{ 'background-color': color.accent }"></div>
        <div :style="{ 'background-color': color.background }"></div>
      </div>
      {{ color.name }}
    </n-card>
  </div>
</template>

<style scoped>
.theme-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* Two columns */
  gap: 10px;
  /* Space between items */
  list-style-type: none;
  padding: 0;
}

.colors {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.color-option {
  display: flex;

  & div {
    height: 10px;
    width: 30px;
  }

  &:hover {
    boder: 1px solid;
  }
}
</style>
