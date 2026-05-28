<script setup lang="ts">
import { useStore } from "@/client/store";
import {
  createAppDraftFromApp,
  createEmptyAppDraft,
  saveAppDraft,
} from "@/client/lib/app-editor";
import { Edit16Regular } from "@vicons/fluent";
import { ref } from "vue";

const isModalshow = ref(false);
const store = useStore();
const protocolOptions = [
  { label: "http://", value: "http://" },
  { label: "https://", value: "https://" },
] as const;

const tempName = ref("");
const tempProtocol = ref<"http://" | "https://">("http://");
const tempUrl = ref("");
const tempIcon = ref("");
const tempDescription = ref("");
const tempId = ref<number | null>(null);

const saveApp = async () => {
  const result = await saveAppDraft(store, {
    id: tempId.value,
    name: tempName.value,
    protocol: tempProtocol.value,
    url: tempUrl.value,
    icon: tempIcon.value,
    description: tempDescription.value,
  });

  if (result) {
    console.log("App updated successfully:", result);
    isModalshow.value = false;
  } else {
    console.error("Failed to update app");
  }
};

const applyDraft = (draft: {
  id: number | null;
  name: string;
  protocol: "http://" | "https://";
  url: string;
  icon: string;
  description: string;
}) => {
  tempName.value = draft.name;
  tempProtocol.value = draft.protocol;
  tempUrl.value = draft.url;
  tempIcon.value = draft.icon;
  tempDescription.value = draft.description;
  tempId.value = draft.id;
  isModalshow.value = true;
};

const openEditAppModal = (app: any) => {
  applyDraft(createAppDraftFromApp(app));
};

const openCreateAppModal = () => {
  applyDraft(createEmptyAppDraft());
};

defineExpose({
  openCreateAppModal,
});
</script>
<template>
  <div>
    <div class="apps-container">
      <div v-for="app in store.apps" :key="app.id" class="app">
        <a
          :href="app.appData?.url || ''"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="icon-wrapper">
            <img
              v-if="app.appData?.icon"
              :src="app.appData.icon"
              :alt="`${app.appName} icon`"
              class="app-icon"
            >
          </div>
          <div class="app-copy">
            <div>{{ app.appName }}</div>
            <div v-if="app.appData?.description" class="app-description">
              {{ app.appData.description }}
            </div>
          </div>
        </a>
        <n-button
          quaternary
          circle
          class="icon-button"
          @click="openEditAppModal(app)"
        >
          <template #icon>
            <n-icon>
              <Edit16Regular />
            </n-icon>
          </template>
        </n-button>
      </div>
      <n-modal v-model:show="isModalshow">
        <n-card
          style="width: 600px"
          :title="tempId === null ? 'Add App' : 'Edit App'"
          :bordered="false"
          size="huge"
          role="dialog"
          aria-modal="true"
        >
          <div class="container">
            <n-input v-model:value="tempName" placeholder="App Name" />
            <n-input-group>
              <n-select
                v-model:value="tempProtocol"
                :options="protocolOptions"
                class="protocol-select"
              />
              <n-input v-model:value="tempUrl" placeholder="example.com" />
            </n-input-group>
            <n-input v-model:value="tempIcon" placeholder="Icon URL" />
            <n-input
              v-model:value="tempDescription"
              type="textarea"
              placeholder="Description"
            />
          </div>
          <template #footer>
            <n-space justify="end">
              <n-button @click="isModalshow = false">Close</n-button>
              <n-button type="primary" @click="saveApp()">Save</n-button>
            </n-space>
          </template>
        </n-card>
      </n-modal>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: block;
  padding: 10px;
  position: relative;
  /* border: 1px solid #ccc; */
  margin: 5px;
  border-radius: 5px;

  &:hover {
    background-color: #e9e9e9;
  }
}

.container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.apps-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.icon-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.protocol-select {
  width: 120px;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  margin-right: 10px;
  background-color: #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.app-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-copy {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  vertical-align: top;
}

.app-description {
  max-width: 220px;
  color: #666;
  font-size: 0.875rem;
}
</style>
