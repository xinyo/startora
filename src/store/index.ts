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
  reorderApp(
    id: number,
    categoryId: number | null,
    position: number,
  ): Promise<void>;
  createCategory(input: CategoryItemInput): Promise<CategoryItem>;
  updateCategory(id: number, input: CategoryItemInput): Promise<CategoryItem>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(orderedIds: number[]): Promise<void>;
}

function categoryApps(
  appsById: Record<number, AppItem>,
  categoryId: number | null,
  excludedId?: number,
): AppItem[] {
  return Object.values(appsById)
    .filter(
      (appItem) =>
        appItem.categoryId === categoryId && appItem.id !== excludedId,
    )
    .sort((left, right) => left.sortId - right.sortId || left.id - right.id);
}

function writeCategoryOrder(
  appsById: Record<number, AppItem>,
  orderedApps: AppItem[],
  categoryId: number | null,
): void {
  orderedApps.forEach((appItem, sortId) => {
    appsById[appItem.id] = { ...appItem, categoryId, sortId };
  });
}

export function reorderAppsById(
  appsById: Record<number, AppItem>,
  appId: number,
  categoryId: number | null,
  position: number,
): Record<number, AppItem> {
  const draggedApp = appsById[appId];
  if (!draggedApp) {
    throw new Error("Cannot reorder an app that is not in the store.");
  }

  const sourceCategoryId = draggedApp.categoryId;
  const source = categoryApps(appsById, sourceCategoryId, appId);
  const sameCategory = sourceCategoryId === categoryId;
  const target = sameCategory
    ? source
    : categoryApps(appsById, categoryId, appId);
  if (!Number.isSafeInteger(position) || position < 0 || position > target.length) {
    throw new RangeError("The app reorder position is outside the target category.");
  }

  const nextTarget = [...target];
  nextTarget.splice(position, 0, draggedApp);
  const next = { ...appsById };
  if (!sameCategory) {
    writeCategoryOrder(next, source, sourceCategoryId);
  }
  writeCategoryOrder(next, nextTarget, categoryId);
  return next;
}

function withoutApp(
  appsById: Record<number, AppItem>,
  appId: number,
): Record<number, AppItem> {
  const removed = appsById[appId];
  const next = { ...appsById };
  delete next[appId];
  if (removed) {
    writeCategoryOrder(next, categoryApps(next, removed.categoryId), removed.categoryId);
  }
  return next;
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
    set((state) => {
      const withCreated = { ...state.appsById, [appItem.id]: appItem };
      return {
        appsById: reorderAppsById(
          withCreated,
          appItem.id,
          appItem.categoryId,
          0,
        ),
        appIds: [appItem.id, ...state.appIds],
      };
    });
    return appItem;
  },

  async updateApp(id, input) {
    const appItem = await api.updateApp(id, input);
    set((state) => {
      const current = state.appsById[id];
      if (!current || current.categoryId === appItem.categoryId) {
        return { appsById: { ...state.appsById, [id]: appItem } };
      }
      const reordered = reorderAppsById(
        state.appsById,
        id,
        appItem.categoryId,
        0,
      );
      reordered[id] = appItem;
      return { appsById: reordered };
    });
    return appItem;
  },

  async deleteApp(id) {
    await api.deleteApp(id);
    set((state) => {
      return {
        appsById: withoutApp(state.appsById, id),
        appIds: state.appIds.filter((appId) => appId !== id),
      };
    });
  },

  async reorderApp(id, categoryId, position) {
    const previousAppsById = get().appsById;
    const optimisticAppsById = reorderAppsById(
      previousAppsById,
      id,
      categoryId,
      position,
    );
    const affectedIds = Object.keys(optimisticAppsById)
      .map(Number)
      .filter(
        (appId) => optimisticAppsById[appId] !== previousAppsById[appId],
      );
    set({ appsById: optimisticAppsById });

    try {
      const reorderedApps = await api.reorderApp({
        appId: id,
        categoryId,
        position,
      });
      set((state) => {
        const appsById = { ...state.appsById };
        for (const appItem of reorderedApps) {
          appsById[appItem.id] = appItem;
        }
        return { appsById };
      });
    } catch (error) {
      set((state) => {
        const appsById = { ...state.appsById };
        for (const appId of affectedIds) {
          appsById[appId] = previousAppsById[appId];
        }
        return { appsById };
      });
      throw error;
    }
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
      const appsById = { ...state.appsById };
      const movedApps = categoryApps(appsById, id);
      const uncategorized = categoryApps(appsById, null);
      writeCategoryOrder(appsById, [...movedApps, ...uncategorized], null);
      return {
        categoriesById,
        categoryIds: state.categoryIds.filter((catId) => catId !== id),
        appsById,
      };
    });
  },

  async reorderCategories(orderedIds) {
    const previousCategoryIds = get().categoryIds;
    const previousPositions = new Map(
      previousCategoryIds.map((id) => [id, get().categoriesById[id]?.position]),
    );

    set((state) => {
      const categoryIds = orderedIds.filter((id) => state.categoriesById[id]);
      const categoriesById = { ...state.categoriesById };
      categoryIds.forEach((id, position) => {
        const category = categoriesById[id];
        if (category) {
          categoriesById[id] = { ...category, position };
        }
      });
      return { categoryIds, categoriesById };
    });

    try {
      await api.reorderCategories(orderedIds);
    } catch (error) {
      set((state) => {
        const categoriesById = { ...state.categoriesById };
        for (const [id, position] of previousPositions) {
          const category = categoriesById[id];
          if (category && position !== undefined) {
            categoriesById[id] = { ...category, position };
          }
        }
        return {
          categoryIds: previousCategoryIds.filter(
            (id) => categoriesById[id] !== undefined,
          ),
          categoriesById,
        };
      });
      throw error;
    }
  },
}));
