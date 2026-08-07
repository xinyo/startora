import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => {
  class ApiClientError extends Error {
    status: number;
    code: string;
    fields?: Record<string, string>;

    constructor(
      status: number,
      code: string,
      message: string,
      fields?: Record<string, string>,
    ) {
      super(message);
      this.status = status;
      this.code = code;
      this.fields = fields;
    }
  }

  return {
    ApiClientError,
    api: {
      session: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      listApps: vi.fn(),
      createApp: vi.fn(),
      updateApp: vi.fn(),
      deleteApp: vi.fn(),
      reorderApp: vi.fn(),
      listCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      reorderCategories: vi.fn(),
    },
  };
});

import { api, ApiClientError } from "@/lib/api";
import { reorderAppsById, useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

const appItem: AppItem = {
  id: 7,
  name: "Docs",
  icon: "default-app.svg",
  url: "https://docs.example.com/",
  categoryId: null,
  sortId: 0,
  createdAt: "2026-07-23T00:00:00Z",
  updatedAt: "2026-07-23T00:00:00Z",
};

function resetStore(): void {
  useAppStore.setState({
    authStatus: "idle",
    user: null,
    appsById: {},
    appIds: [],
    errorCode: null,
  });
}

describe("Zustand app store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it("restores the cookie session and indexes the app list by id", async () => {
    vi.mocked(api.session).mockResolvedValue({ id: 1, username: "Ada" });
    vi.mocked(api.listApps).mockResolvedValue([appItem]);
    vi.mocked(api.listCategories).mockResolvedValue([]);

    await useAppStore.getState().initialize();

    expect(useAppStore.getState()).toMatchObject({
      authStatus: "authenticated",
      user: { id: 1, username: "Ada" },
      appIds: [7],
      appsById: { 7: appItem },
    });
  });

  it("becomes anonymous when session restoration returns 401", async () => {
    vi.mocked(api.session).mockRejectedValue(
      new ApiClientError(401, "UNAUTHENTICATED", "Authentication is required."),
    );

    await useAppStore.getState().initialize();

    expect(useAppStore.getState().authStatus).toBe("anonymous");
    expect(useAppStore.getState().user).toBeNull();
  });

  it("logs in, registers, and always clears state on logout", async () => {
    vi.mocked(api.login).mockResolvedValue({ id: 2, username: "Grace" });
    vi.mocked(api.listApps).mockResolvedValue([]);
    vi.mocked(api.listCategories).mockResolvedValue([]);
    await useAppStore.getState().login("Grace", "password-one");
    expect(useAppStore.getState().user?.username).toBe("Grace");

    vi.mocked(api.logout).mockRejectedValue(new Error("offline"));
    await useAppStore.getState().logout();
    expect(useAppStore.getState().authStatus).toBe("anonymous");

    vi.mocked(api.register).mockResolvedValue({ id: 3, username: "Linus" });
    await useAppStore.getState().register("Linus", "password-two");
    expect(useAppStore.getState()).toMatchObject({
      authStatus: "authenticated",
      user: { id: 3, username: "Linus" },
      initialized: true,
    });
    expect(api.listApps).toHaveBeenCalledTimes(2);
    expect(api.listCategories).toHaveBeenCalledTimes(2);
  });

  it("applies create, update, and delete results without refetching", async () => {
    useAppStore.setState({
      authStatus: "authenticated",
      user: { id: 1, username: "Ada" },
    });
    vi.mocked(api.createApp).mockResolvedValue(appItem);

    await useAppStore.getState().createApp({
      name: appItem.name,
      icon: appItem.icon,
      url: appItem.url,
      categoryId: undefined,
    });
    expect(useAppStore.getState().appIds).toEqual([7]);

    const updated = { ...appItem, name: "Documentation" };
    vi.mocked(api.updateApp).mockResolvedValue(updated);
    await useAppStore.getState().updateApp(7, {
      name: updated.name,
      icon: updated.icon,
      url: updated.url,
    });
    expect(useAppStore.getState().appsById[7]?.name).toBe("Documentation");

    vi.mocked(api.deleteApp).mockResolvedValue();
    await useAppStore.getState().deleteApp(7);
    expect(useAppStore.getState().appIds).toEqual([]);
    expect(useAppStore.getState().appsById[7]).toBeUndefined();
  });

  it("reindexes same-category and cross-category moves", () => {
    const second = { ...appItem, id: 8, name: "Status", sortId: 1 };
    const categorized = {
      ...appItem,
      id: 9,
      name: "Design",
      categoryId: 4,
      sortId: 0,
    };
    const indexed = { 7: appItem, 8: second, 9: categorized };

    const withinCategory = reorderAppsById(indexed, 7, null, 1);
    expect(withinCategory[8].sortId).toBe(0);
    expect(withinCategory[7].sortId).toBe(1);

    const acrossCategories = reorderAppsById(withinCategory, 8, 4, 1);
    expect(acrossCategories[7]).toMatchObject({ categoryId: null, sortId: 0 });
    expect(acrossCategories[9]).toMatchObject({ categoryId: 4, sortId: 0 });
    expect(acrossCategories[8]).toMatchObject({ categoryId: 4, sortId: 1 });
  });

  it("optimistically reorders apps and merges the server result", async () => {
    const second = { ...appItem, id: 8, name: "Status", sortId: 1 };
    useAppStore.setState({
      appsById: { 7: appItem, 8: second },
      appIds: [7, 8],
    });
    const serverResult = [
      { ...second, sortId: 0 },
      { ...appItem, sortId: 1 },
    ];
    vi.mocked(api.reorderApp).mockResolvedValue(serverResult);

    const saving = useAppStore.getState().reorderApp(7, null, 1);
    expect(useAppStore.getState().appsById[8].sortId).toBe(0);
    expect(useAppStore.getState().appsById[7].sortId).toBe(1);
    await saving;

    expect(api.reorderApp).toHaveBeenCalledWith({
      appId: 7,
      categoryId: null,
      position: 1,
    });
    expect(useAppStore.getState().appsById[7]).toEqual(serverResult[1]);
  });

  it("restores the previous order when persistence fails", async () => {
    const second = { ...appItem, id: 8, name: "Status", sortId: 1 };
    useAppStore.setState({
      appsById: { 7: appItem, 8: second },
      appIds: [7, 8],
    });
    vi.mocked(api.reorderApp).mockRejectedValue(new Error("offline"));

    await expect(
      useAppStore.getState().reorderApp(7, null, 1),
    ).rejects.toThrow("offline");
    expect(useAppStore.getState().appsById[7].sortId).toBe(0);
    expect(useAppStore.getState().appsById[8].sortId).toBe(1);
  });
});
