import * as API from "@/server/api";
import { defineStore } from "pinia";
import {
  clearAccessToken,
  hasAccessToken,
  setAccessToken,
} from "../lib/auth-session";
import { Theme } from "../types/store";

const defaultSession = () => ({
  id: 0,
  name: "",
  email: "",
  avatar: "",
  isAdmin: false,
  isActive: false,
});

export const useStore = defineStore("store", {
  state: () => ({
    apps: [] as any[],
    session: defaultSession(),
    theme: { primary: "", accent: "", background: "" },
    accessToken: "",
    authInitialized: false,
  }),
  getters: {
    isAuthenticated: (state) => state.authInitialized && state.accessToken.length > 0,
  },
  actions: {
    async init() {
      if (this.authInitialized) {
        return;
      }

      try {
        const response = await API.refreshSession();
        this.applyAuthResponse(response);
        await this.initApps();
      } catch {
        this.clearAuthState();
      } finally {
        this.authInitialized = true;
      }
    },

    async ensureInitialized() {
      if (!this.authInitialized) {
        await this.init();
      }
    },

    applyAuthResponse(response: any) {
      const token = response?.accessToken ?? response?.token;
      const user = response?.user;

      if (!token || !user) {
        throw new Error("Invalid auth response");
      }

      setAccessToken(token);
      this.accessToken = token;
      this.session = {
        ...defaultSession(),
        id: user.id,
        name: user.username,
      };
      this.authInitialized = true;
    },

    clearAuthState() {
      clearAccessToken();
      this.accessToken = "";
      this.apps = [];
      this.session = defaultSession();
    },

    async login(username: string, password: string) {
      try {
        const response = await API.login(username, password);
        if (response.success) {
          this.applyAuthResponse(response);
          await this.initApps();
          console.log("Login successful:", response.user);
          return response;
        }
      } catch (error) {
        console.error("Failed to login:", error);
        throw error;
      }
    },

    async logout() {
      try {
        await API.logout();
      } finally {
        this.clearAuthState();
        this.authInitialized = true;
      }
    },

    async initApps() {
      if (!this.session.id || !hasAccessToken()) {
        this.apps = [];
        return;
      }

      try {
        const apps = await API.getUserApps(this.session.id);
        console.log("Fetched user's apps:", apps);
        this.apps = apps;
      } catch (error) {
        console.error("Failed to fetch user's apps:", error);
      }
    },

    async addUser(name: string, password: string) {
      try {
        const response = await API.addUser(name, password);
        console.log("Added user:", response);
        return response;
      } catch (error) {
        console.error("Failed to add user:", error);
        throw error;
      }
    },

    async updateTheme(newValue: Omit<Theme, "name">) {
      this.theme = newValue;
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
          await this.initApps();
          return updatedApp;
        }
      } catch (error) {
        console.error("Failed to update user app:", error);
      }
    },
  },
});
