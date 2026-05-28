import { describe, expect, it, vi } from "vitest";
import { resolveAuthNavigationWithStore } from "./auth-guard";

describe("client auth guard", () => {
  it("redirects to login for protected routes when unauthenticated", async () => {
    const store = {
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: false,
    };

    const result = await resolveAuthNavigationWithStore(store, {
      path: "/",
      meta: { requiresAuth: true },
    });

    expect(result).toBe("/login");
    expect(store.ensureInitialized).toHaveBeenCalledTimes(1);
  });

  it("redirects authenticated users away from the login route", async () => {
    const store = {
      ensureInitialized: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: true,
    };

    const result = await resolveAuthNavigationWithStore(store, {
      path: "/login",
      meta: { requiresAuth: false },
    });

    expect(result).toBe("/");
  });
});
