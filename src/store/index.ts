import { create } from "zustand";
import { api, ApiClientError } from "@/lib/api";
import type {
  AppItem,
  AppItemInput,
  CategoryItem,
  CategoryItemInput,
  User,
} from "@/types/contracts";

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
  categoriesById: Record<number, CategoryItem>;
  categoryIds: number[];
  errorCode: string | null;
  initialized: boolean;
  initialize(): Promise<void>;
  login(username: string, password: string): Promise<void>;
  register(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadApps(): Promise<void>;
  loadCategories(): Promise<void>;
  createApp(input: AppItemInput): Promise<AppItem>;
  updateApp(id: number, input: AppItemInput): Promise<AppItem>;
  deleteApp(id: number): Promise<void>;
  createCategory(input: CategoryItemInput): Promise<CategoryItem>;
  updateCategory(id: number, input: CategoryItemInput): Promise<CategoryItem>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(orderedIds: number[]): Promise<void>;
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

function indexCategories(categories: CategoryItem[]): {
  categoriesById: Record<number, CategoryItem>;
  categoryIds: number[];
} {
  const categoriesById: Record<number, CategoryItem> = {};
  const categoryIds: number[] = [];

  for (const cat of categories) {
    categoriesById[cat.id] = cat;
    categoryIds.push(cat.id);
  }

  return { categoriesById, categoryIds };
}

const anonymousState: Pick<
  AppStore,
  | "authStatus"
  | "user"
  | "appsById"
  | "appIds"
  | "categoriesById"
  | "categoryIds"
  | "initialized"
> = {
  authStatus: "anonymous",
  user: null,
  appsById: {},
  appIds: [],
  categoriesById: {},
  categoryIds: [],
  initialized: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
  authStatus: "idle",
  user: null,
  appsById: {},
  appIds: [],
  categoriesById: {},
  categoryIds: [],
  errorCode: null,
  initialized: false,

  async initialize() {
    if (get().authStatus !== "idle") {
      return;
    }

    set({ authStatus: "initializing", errorCode: null });
    try {
      const user = await api.session();
      set({ authStatus: "authenticated", user });
      try {
        const [apps, categories] = await Promise.all([
          api.listApps(),
          api.listCategories(),
        ]);
        set({
          ...indexApps(apps),
          ...indexCategories(categories),
          errorCode: null,
          initialized: true,
        });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          set({ ...anonymousState, errorCode: null });
          return;
        }
        set({ errorCode: "APPS_LOAD_FAILED", initialized: true });
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
      categoriesById: {},
      categoryIds: [],
      errorCode: null,
      initialized: false,
    });
    await Promise.all([get().loadApps(), get().loadCategories()]);
    set({ initialized: true });
  },

  async register(username, password) {
    const user = await api.register(username, password);
    set({
      authStatus: "authenticated",
      user,
      appsById: {},
      appIds: [],
      categoriesById: {},
      categoryIds: [],
      errorCode: null,
      initialized: false,
    });
    await Promise.all([get().loadApps(), get().loadCategories()]);
    set({ initialized: true });
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
      set({ ...indexApps(apps), errorCode: null, initialized: true });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        set({ ...anonymousState, errorCode: null });
      }
      throw error;
    }
  },

  async loadCategories() {
    try {
      const categories = await api.listCategories();
      set({
        ...indexCategories(categories),
        errorCode: null,
        initialized: true,
      });
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

  async createCategory(input) {
    const categoryItem = await api.createCategory(input);
    set((state) => ({
      categoriesById: {
        ...state.categoriesById,
        [categoryItem.id]: categoryItem,
      },
      categoryIds: [...state.categoryIds, categoryItem.id],
    }));
    return categoryItem;
  },

  async updateCategory(id, input) {
    const categoryItem = await api.updateCategory(id, input);
    set((state) => ({
      categoriesById: {
        ...state.categoriesById,
        [id]: categoryItem,
      },
    }));
    return categoryItem;
  },

  async deleteCategory(id) {
    await api.deleteCategory(id);
    set((state) => {
      const categoriesById = { ...state.categoriesById };
      delete categoriesById[id];
      // Clear categoryId from apps that belonged to the deleted category
      const appsById = { ...state.appsById };
      for (const appId of Object.keys(appsById)) {
        const app = appsById[Number(appId)];
        if (app.categoryId === id) {
          appsById[Number(appId)] = { ...app, categoryId: null };
        }
      }
      return {
        categoriesById,
        categoryIds: state.categoryIds.filter((catId) => catId !== id),
        appsById,
      };
    });
  },

  async reorderCategories(orderedIds) {
    // Optimistic update
    set((state) => {
      const categoryIds = orderedIds.filter((id) => state.categoriesById[id]);
      return { categoryIds };
    });
    await api.reorderCategories(orderedIds);
  },
}));
