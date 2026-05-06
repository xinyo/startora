import { describe, expect, it, vi } from "vitest";
import {
  createAppDraftFromApp,
  createEmptyAppDraft,
  joinAppUrl,
  saveAppDraft,
  splitAppUrl,
} from "./app-editor";

describe("app editor helpers", () => {
  it("creates a blank draft for new apps", () => {
    expect(createEmptyAppDraft()).toEqual({
      id: null,
      name: "",
      protocol: "http://",
      url: "",
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
      protocol: "https://",
      url: "example.com",
    });
  });

  it("splits a full url into protocol and value", () => {
    expect(splitAppUrl("http://example.com")).toEqual({
      protocol: "http://",
      url: "example.com",
    });
  });

  it("defaults to http when the saved url has no protocol", () => {
    expect(splitAppUrl("example.com")).toEqual({
      protocol: "http://",
      url: "example.com",
    });
  });

  it("joins protocol and value before saving", () => {
    expect(joinAppUrl({
      protocol: "https://",
      url: "example.com",
    })).toBe("https://example.com");
  });

  it("saves a new app through addUserApp", async () => {
    const store = {
      addUserApp: vi.fn().mockResolvedValue({ id: 1 }),
      putUserApp: vi.fn(),
    };

    await saveAppDraft(store, {
      id: null,
      name: "Docs",
      protocol: "https://",
      url: "example.com",
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
      protocol: "https://",
      url: "example.com",
    });

    expect(store.putUserApp).toHaveBeenCalledTimes(1);
    expect(store.putUserApp).toHaveBeenCalledWith(42, "Docs", {
      url: "https://example.com",
    });
    expect(store.addUserApp).not.toHaveBeenCalled();
  });
});
