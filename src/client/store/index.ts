import * as API from "@/server/api";
import { defineStore } from "pinia";
import { Theme } from "../types/store";

export const useStore = defineStore("store", {
  state: () => ({
    apps: [] as any[],
    session: {
      id: 0,
      name: "",
      email: "",
      avatar: "",
      isAdmin: false,
      isActive: false,
    },
    theme: { primary: "", accent: "", background: "" },
  }),
  getters: {},
  actions: {
    async init() {
      this.initSession();
      this.initApps();
    },
    async initSession() {
      // Load session from localStorage or API
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      if (session.id !== 0) {
        this.session = session;
      } else {
        // Fetch from API if not found in localStorage
        try {
          const response = await API.getUsers();
          console.log("Fetched session:", response);
          this.session.id = response[0]?.id; // Use first user as session
          const user = await API.getUser(this.session.id);
          console.log("Fetched user:", user);
          this.session = {
            ...this.session, // default values
            ...user,
          };
          localStorage.setItem("session", JSON.stringify(this.session));
        } catch (error) {
          console.error("Failed to fetch session:", error);
        }
      }
    },
    async initApps() {
      try {
        const apps = await API.getUserApps(this.session.id);
        console.log("Fetched user's apps:", apps);
        this.apps = apps;
      } catch (error) {
        console.error("Failed to fetch user's apps:", error);
      }
    },
    async updateTheme(newValue: Omit<Theme, "name">) {
      this.theme = newValue;
      // save to db
      await API.saveTheme(newValue);
    },
    async addUserApp(appName: string, appData: any) {
      try {
        const id = this.session.id;
        const newApp = await API.addUserApp(id, appName, appData);
        console.log("Added new app:", newApp);
        if (newApp) {
          this.apps.push(newApp);
          return newApp;
        }
      } catch (error) {
        console.error("Failed to add user app:", error);
      }
    },
    async putUserApp(appId: number, appName: string, appData: any) {
      try {
        const id = this.session.id;
        const updatedApp = await API.putUserApp(id, appName, appData, appId);
        console.log("Updated user app:", updatedApp);
        if (updatedApp) {
          this.initApps();
          return updatedApp;
        }
      } catch (error) {
        console.error("Failed to update user app:", error);
      }
    },
  },
});
