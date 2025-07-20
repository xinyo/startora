<script setup lang="ts">
import { useStore } from "@/client/store";
import { useDialog } from "naive-ui";

const dialog = useDialog()

const store = useStore();
const formatUrl = (url: string): string => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return `http://${url}`;
    }
    return url;
};
</script>
<template>
    <div>
        this is main
        <div>

            <div v-for="app in store.apps" :key="app.id">
                <a class="app" :href="app.appData.url" target="_blank" rel="noopener noreferrer">{{ app.appName }}</a>

            </div>
        </div>
    </div>
</template>

<style scoped>
.app {
    display: block;
    padding: 10px;
    border: 1px solid #ccc;
    margin: 5px;
    border-radius: 5px;
    background-color: #f9f9f9;
}
</style>