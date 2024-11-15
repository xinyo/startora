import { defineStore } from "pinia";
import { Theme } from "../client/types/store";

export const useStore = defineStore("store", {
  state: () => ({ theme: { primary: "", accent: "", background: "" } }),
  getters: {},
  actions: {
    updateTheme(newValue: Omit<Theme, "name">) {
      this.theme = newValue;
    },
  },
});
