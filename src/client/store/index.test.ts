import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken } from "../lib/auth-session";
import { useStore } from "./index";

vi.mock("@/server/api", () => ({
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
  getUserApps: vi.fn(),
  addUser: vi.fn(),
  saveTheme: vi.fn(),
  addUserApp: vi.fn(),
  putUserApp: vi.fn(),
}));

import * as API from "@/server/api";

describe("client auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("hydrates auth state from refresh on init", async () => {
    vi.mocked(API.refreshSession).mockResolvedValueOnce({
      success: true,
      accessToken: "access-token",
      user: { id: 11, username: "alice" },
    } as never);
    vi.mocked(API.getUserApps).mockResolvedValueOnce([
      { id: 1, appName: "Docs", appData: { url: "https://example.com" } },
    ] as never);

    const store = useStore();
    await store.init();

    expect(store.authInitialized).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.session.id).toBe(11);
    expect(store.session.name).toBe("alice");
    expect(store.apps).toHaveLength(1);
    expect(getAccessToken()).toBe("access-token");
  });

  it("clears auth state on logout", async () => {
    vi.mocked(API.login).mockResolvedValueOnce({
      success: true,
      accessToken: "access-token",
      user: { id: 12, username: "bob" },
    } as never);
    vi.mocked(API.getUserApps).mockResolvedValue([] as never);

    const store = useStore();
    await store.login("bob", "secret");
    await store.logout();

    expect(API.logout).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated).toBe(false);
    expect(store.session.id).toBe(0);
    expect(store.apps).toEqual([]);
    expect(getAccessToken()).toBe("");
  });
});
