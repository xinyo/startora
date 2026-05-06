import { describe, expect, it, vi } from "vitest";
import {
  createAppDraftFromApp,
  createEmptyAppDraft,
  saveAppDraft,
} from "./app-editor";

describe("app editor helpers", () => {
  it("creates a blank draft for new apps", () => {
    expect(createEmptyAppDraft()).toEqual({
      id: null,
      name: "",
      url: "http://",
    });
  });

  it("creates an editable draft from an existing app", () => {
    expect(createAppDraftFromApp({
      id: 42,
      appName: "Docs",
      appData: { url: "https://example.com" },
    })).toEqual({
      id: 42,
      name: "Docs",
      url: "https://example.com",
    });
  });

  it("saves a new app through addUserApp", async () => {
    const store = {
      addUserApp: vi.fn().mockResolvedValue({ id: 1 }),
      putUserApp: vi.fn(),
    };

    await saveAppDraft(store, {
      id: null,
      name: "Docs",
      url: "https://example.com",
    });

    expect(store.addUserApp).toHaveBeenCalledTimes(1);
    expect(store.addUserApp).toHaveBeenCalledWith("Docs", {
      url: "https://example.com",
    });
    expect(store.putUserApp).not.toHaveBeenCalled();
  });

  it("saves an existing app through putUserApp", async () => {
    const store = {
      addUserApp: vi.fn(),
      putUserApp: vi.fn().mockResolvedValue({ id: 42 }),
    };

    await saveAppDraft(store, {
      id: 42,
      name: "Docs",
      url: "https://example.com",
    });

    expect(store.putUserApp).toHaveBeenCalledTimes(1);
    expect(store.putUserApp).toHaveBeenCalledWith(42, "Docs", {
      url: "https://example.com",
    });
    expect(store.addUserApp).not.toHaveBeenCalled();
  });
});
