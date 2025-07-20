<script lang="ts" setup>
import { NTabPane, NTabs } from "naive-ui";
import { ref } from "vue";
// import type { TabsProps } from 'naive-ui'
import General from "./general.vue";
import Theme from "./theme.vue";

// Define the tabs and config data
const title = "Config Page";
const selected = ref(null);


const tabs = [
  {
    name: "General",
    id: "general",
    component: General,
  },
  { name: "Theme", id: "theme", component: Theme },
];

const createUser = async () => {
  await API.addUser(state.userName, state.userEmail);
};
</script>

<template>
  <div class="config-container">

    <h1>{{ title }}</h1>
    <button @click="createUser"></button>
    {{ selected }}

    <n-tabs type="line" placement="left" animated>
      <n-tab-pane v-for="tab in tabs" :name="tab.id" :tab="tab.name">
        <component :is="tab.component"></component>
      </n-tab-pane>
    </n-tabs>

    <!-- <div class="tabs">
      <div class="tab-list">
        <ul>
          <li
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-item', { active: tab.id === selectedTab }]"
            @click="selectTab(tab.id)"
          >
            {{ tab.name }}
          </li>
        </ul>
      </div>
      <div class="tab-content">
        <component :is="currentTabComponent"></component>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.config-container {}

.tabs {
  display: flex;
  gap: 20px;
  width: 50vw;
  min-width: 500px;
}

.tab-list {
  width: 200px;
}

.tab-list ul {
  list-style-type: none;
  padding: 0;
}

.tab-item {
  padding: 10px;
  cursor: pointer;
  margin-bottom: 5px;
}

.tab-item:hover {
  background-color: #f0f0f0;
}

.tab-item.active {
  font-weight: bold;
  background-color: #e0e0e0;
  border-left: 4px solid #4caf50;
}

.tab-content {
  flex-grow: 1;

  padding: 15px;
  background-color: #fff;
}
</style>
