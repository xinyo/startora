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
    },
  };
});

import { api, ApiClientError } from "@/lib/api";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

const appItem: AppItem = {
  id: 7,
  name: "Docs",
  icon: "default-app.svg",
  url: "https://docs.example.com/",
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
    });
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
});
