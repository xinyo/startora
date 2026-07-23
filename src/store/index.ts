import { create } from "zustand";
import { api, ApiClientError } from "@/lib/api";
import type { AppItem, AppItemInput, User } from "@/types/contracts";

export type AuthStatus =
  | "idle"
  | "initializing"
  | "anonymous"
  | "authenticated";

interface AppStore {
  authStatus: AuthStatus;
  user: User | null;
  appsById: Record<number, AppItem>;
  appIds: number[];
  errorCode: string | null;
  initialize(): Promise<void>;
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadApps(): Promise<void>;
  createApp(input: AppItemInput): Promise<AppItem>;
  updateApp(id: number, input: AppItemInput): Promise<AppItem>;
  deleteApp(id: number): Promise<void>;
}

function indexApps(apps: AppItem[]): {
  appsById: Record<number, AppItem>;
  appIds: number[];
} {
  const appsById: Record<number, AppItem> = {};
  const appIds: number[] = [];

  for (const appItem of apps) {
    appsById[appItem.id] = appItem;
    appIds.push(appItem.id);
  }

  return { appsById, appIds };
}

const anonymousState = {
  authStatus: "anonymous" as const,
  user: null,
  appsById: {},
  appIds: [],
};

export const useAppStore = create<AppStore>((set, get) => ({
  authStatus: "idle",
  user: null,
  appsById: {},
  appIds: [],
  errorCode: null,

  async initialize() {
    if (get().authStatus !== "idle") {
      return;
    }

    set({ authStatus: "initializing", errorCode: null });
    try {
      const user = await api.session();
      set({ authStatus: "authenticated", user });
      try {
        const apps = await api.listApps();
        set({ ...indexApps(apps), errorCode: null });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          set({ ...anonymousState, errorCode: null });
          return;
        }
        set({ errorCode: "APPS_LOAD_FAILED" });
      }
    } catch (error) {
      set({
        ...anonymousState,
        errorCode:
          error instanceof ApiClientError && error.status === 401
            ? null
            : "SESSION_LOAD_FAILED",
      });
    }
  },

  async login(username, password) {
    const user = await api.login(username, password);
    set({
      authStatus: "authenticated",
      user,
      appsById: {},
      appIds: [],
      errorCode: null,
    });
    await get().loadApps();
  },

  async register(username, password) {
    const user = await api.register(username, password);
    set({
      authStatus: "authenticated",
      user,
      appsById: {},
      appIds: [],
      errorCode: null,
    });
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      // Local state must still be cleared if the server cannot be reached.
    } finally {
      set({ ...anonymousState, errorCode: null });
    }
  },

  async loadApps() {
    try {
      const apps = await api.listApps();
      set({ ...indexApps(apps), errorCode: null });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        set({ ...anonymousState, errorCode: null });
      }
      throw error;
    }
  },

  async createApp(input) {
    const appItem = await api.createApp(input);
    set((state) => ({
      appsById: { ...state.appsById, [appItem.id]: appItem },
      appIds: [appItem.id, ...state.appIds],
    }));
    return appItem;
  },

  async updateApp(id, input) {
    const appItem = await api.updateApp(id, input);
    set((state) => ({
      appsById: { ...state.appsById, [id]: appItem },
    }));
    return appItem;
  },

  async deleteApp(id) {
    await api.deleteApp(id);
    set((state) => {
      const appsById = { ...state.appsById };
      delete appsById[id];
      return {
        appsById,
        appIds: state.appIds.filter((appId) => appId !== id),
      };
    });
  },
}));
