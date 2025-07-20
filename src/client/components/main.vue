<script setup lang="ts">
import { useStore } from "@/client/store";
import { Edit16Regular } from "@vicons/fluent";
import { ref } from "vue";

const isModalshow = ref(false);
const store = useStore();

const tempName = ref("");
const tempUrl = ref("");
const tempId = ref(0);

const editApp = async (tempId: number) => {
    const result = await
        store.putUserApp(tempId,
            tempName.value,
            { url: tempUrl.value },
        );
    if (result) {
        console.log("App updated successfully:", result);
        isModalshow.value = false;
    } else {
        console.error("Failed to update app");
    }
};
const showModal = (app: any) => {
    tempName.value = app.appName;
    tempUrl.value = app.appData.url;
    tempId.value = app.id;
    isModalshow.value = true;
};
</script>
<template>
    <div>
        <div class="apps-container">
            <div v-for="app in store.apps" :key="app.id" class="app">
                <a :href="app.appData?.url || ''" target="_blank" rel="noopener noreferrer">
                    <div class="icon-wrapper">

                    </div>
                    <div>{{ app.appName }}</div>
                </a>
                <n-button quaternary circle class="icon-button" @click="showModal(app)">
                    <template #icon>
                        <n-icon>
                            <Edit16Regular />
                        </n-icon>
                    </template>
                </n-button>
            </div>
            <n-modal v-model:show="isModalshow">
                <n-card style="width: 600px" :title="`Edit App${tempId}`" :bordered="false" size="huge" role="dialog"
                    aria-modal="true">
                    <div class="container">
                        <input type="text" v-model="tempName" placeholder="App Name" />
                        <input type="text" v-model="tempUrl" placeholder="App URL" />
                    </div>
                    <template #action>
                        <button @click="isModalshow = false">Close</button>
                        <button @click="editApp(tempId)">Save</button>
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

.icon-wrapper {
    display: inline-block;
    width: 4rem;
    height: 4rem;
    margin-right: 10px;
    background-color: #ccc;
    border-radius: 4px;
}
</style>