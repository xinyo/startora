<script lang="ts" setup>
import { ref, computed } from "vue";
import Theme from "./theme.vue";
import General from "./general.vue";

// Define the tabs and config data
const title = "Config Page";

const tabs = ref([
  {
    name: "General",
    id: "general",
    component: General,
  },
  { name: "Theme", id: "theme", component: Theme },
]);

// Set the default selected tab
const selectedTab = ref(tabs.value[0].id);

// Function to change the selected tab
function selectTab(tabId: string) {
  selectedTab.value = tabId;
}

const currentTabComponent = computed(() => {
  const tab = tabs.value.find((tab) => tab.id === selectedTab.value);
  return tab ? tab.component : null;
});
</script>

<template>
  <div class="config-container">
    <h1>{{ title }}</h1>

    <div class="tabs">
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
    </div>
  </div>
</template>

<style scoped>
.config-container {
}

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
