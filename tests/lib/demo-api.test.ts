import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { selectDataClient } from "@/lib/api";
import { createDemoApi } from "@/lib/demo-api";
import { ApiClientError } from "@/lib/data-client";
import { httpApi } from "@/lib/http-api";

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storageKey = "startora.demo.test";
const initialTime = Temporal.Instant.from("2026-07-28T00:00:00Z");

function createClient(
  storage: Storage,
  getNow: () => Temporal.Instant = () => initialTime,
) {
  return createDemoApi({
    storage,
    storageKey,
    crypto: globalThis.crypto,
    now: getNow,
  });
}

describe("demo data client", () => {
  it("selects localStorage only for demo builds", () => {
    const storage = new MemoryStorage();

    expect(selectDataClient("production")).toBe(httpApi);
    expect(
      selectDataClient("demo", {
        storage,
        storageKey,
        crypto: globalThis.crypto,
        now: () => initialTime,
      }),
    ).not.toBe(httpApi);
  });

  it("registers, restores, logs out, and logs in without storing raw passwords", async () => {
    const storage = new MemoryStorage();
    const client = createClient(storage);

    await expect(client.register("Demo.User", "password-one")).resolves.toEqual(
      {
        id: 1,
        username: "Demo.User",
      },
    );
    await expect(createClient(storage).session()).resolves.toEqual({
      id: 1,
      username: "Demo.User",
    });

    const serialized = storage.getItem(storageKey);
    expect(serialized).not.toContain("password-one");
    expect(serialized).toContain("passwordVerifier");

    await client.logout();
    await expect(client.session()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    await expect(
      client.login("demo.user", "not-the-password"),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
    await expect(client.login("demo.user", "password-one")).resolves.toEqual({
      id: 1,
      username: "Demo.User",
    });
    await expect(
      client.register("DEMO.USER", "password-two"),
    ).rejects.toMatchObject({
      status: 409,
      code: "USERNAME_TAKEN",
    });
  });

  it("seeds every new account exactly once from demo.json", async () => {
    const storage = new MemoryStorage();
    const client = createClient(storage);

    await client.register("First.User", "password-one");
    await expect(client.listCategories()).resolves.toEqual([
      expect.objectContaining({ name: "Work", position: 0 }),
      expect.objectContaining({ name: "Media", position: 1 }),
    ]);
    await expect(client.listApps()).resolves.toEqual([
      expect.objectContaining({
        name: "Jellyfin",
        icon: "jellyfin.png",
        url: "http://192.168.1.30/",
      }),
      expect.objectContaining({
        name: "Postgres",
        icon: "postgresql.svg",
        url: "http://192.168.1.200/",
      }),
      expect.objectContaining({
        name: "Proxmox",
        icon: "proxmox.png",
        url: "http://192.168.1.100/",
      }),
    ]);

    await client.logout();
    await client.login("First.User", "password-one");
    expect(await client.listApps()).toHaveLength(3);

    await client.logout();
    await client.register("Second.User", "password-two");
    expect(await client.listApps()).toHaveLength(3);
    expect(await client.listCategories()).toHaveLength(2);
  });

  it("supports isolated app and category CRUD with ordering and cleanup", async () => {
    const storage = new MemoryStorage();
    const client = createClient(storage);
    await client.register("First.User", "password-one");

    const firstUserAppId = (await client.listApps())[0].id;
    await client.logout();
    await client.register("Second.User", "password-two");
    await expect(
      client.updateApp(firstUserAppId, {
        name: "Not mine",
        icon: "proxmox.png",
        url: "https://example.com",
      }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const custom = await client.createCategory({ name: " Custom " });
    const created = await client.createApp({
      name: " Docs ",
      icon: "proxmox.png",
      url: "https://example.com",
      categoryId: custom.id,
    });
    expect(created).toMatchObject({
      name: "Docs",
      url: "https://example.com/",
      categoryId: custom.id,
    });

    const updated = await client.updateApp(created.id, {
      name: "Documentation",
      icon: "postgresql.svg",
      url: "https://example.com/docs",
      categoryId: custom.id,
    });
    expect(updated.name).toBe("Documentation");

    const categories = await client.listCategories();
    const orderedIds = [
      custom.id,
      ...categories
        .filter((category) => category.id !== custom.id)
        .map((category) => category.id),
    ];
    await client.reorderCategories(orderedIds);
    expect((await client.listCategories()).map((category) => category.id)).toEqual(
      orderedIds,
    );

    await client.deleteCategory(custom.id);
    expect((await client.listApps()).find((app) => app.id === created.id))
      .toMatchObject({ categoryId: null });
    await client.deleteApp(created.id);
    expect((await client.listApps()).some((app) => app.id === created.id)).toBe(
      false,
    );
  });

  it("reorders apps within and across categories", async () => {
    const storage = new MemoryStorage();
    const client = createClient(storage);
    await client.register("Demo.User", "password-one");

    const categories = await client.listCategories();
    const work = categories.find((category) => category.name === "Work")!;
    const media = categories.find((category) => category.name === "Media")!;
    const apps = await client.listApps();
    const proxmox = apps.find((app) => app.name === "Proxmox")!;
    const postgres = apps.find((app) => app.name === "Postgres")!;

    await expect(
      client.reorderApp({
        appId: postgres.id,
        categoryId: work.id,
        position: 0,
      }),
    ).resolves.toMatchObject([
      { id: postgres.id, categoryId: work.id, sortId: 0 },
      { id: proxmox.id, categoryId: work.id, sortId: 1 },
    ]);

    const moved = await client.reorderApp({
      appId: proxmox.id,
      categoryId: media.id,
      position: 1,
    });
    expect(moved.find((app) => app.id === postgres.id)).toMatchObject({
      categoryId: work.id,
      sortId: 0,
    });
    expect(moved.find((app) => app.id === proxmox.id)).toMatchObject({
      categoryId: media.id,
      sortId: 1,
    });

    await expect(
      client.reorderApp({
        appId: postgres.id,
        categoryId: work.id,
        position: 2,
      }),
    ).rejects.toMatchObject({
      status: 400,
      fields: { position: "APP_POSITION_INVALID" },
    });
  });

  it("matches validation and session-expiry errors", async () => {
    const storage = new MemoryStorage();
    let currentTime = initialTime;
    const client = createClient(storage, () => currentTime);

    await expect(client.register("x", "no")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      fields: {
        username: "USERNAME_INVALID",
        password: "PASSWORD_INVALID",
      },
    });

    await client.register("Demo.User", "password-one");
    await expect(
      client.createApp({
        name: "",
        icon: "../unsafe.svg",
        url: "javascript:alert(1)",
        categoryId: -1,
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      fields: {
        name: "APP_NAME_INVALID",
        icon: "APP_ICON_INVALID",
        url: "APP_URL_INVALID",
        categoryId: "APP_CATEGORY_INVALID",
      },
    });

    currentTime = currentTime.add({ hours: 8 * 24 });
    await expect(client.session()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("reports corrupt and unwritable storage without clearing it", async () => {
    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem(storageKey, "{not-json");
    const corruptClient = createClient(corruptStorage);

    await expect(corruptClient.session()).rejects.toEqual(
      expect.objectContaining<ApiClientError>({
        status: 500,
        code: "REQUEST_FAILED",
      }),
    );
    expect(corruptStorage.getItem(storageKey)).toBe("{not-json");

    const invalidShapeStorage = new MemoryStorage();
    invalidShapeStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        nextUserId: 1,
        nextAppId: 1,
        nextCategoryId: 1,
        usersById: { 1: { username: "missing fields" } },
        userIds: [1],
        appsById: {},
        categoriesById: {},
        session: null,
      }),
    );
    await expect(createClient(invalidShapeStorage).session()).rejects.toMatchObject(
      {
        status: 500,
        code: "REQUEST_FAILED",
      },
    );

    class UnwritableStorage extends MemoryStorage {
      override setItem(): void {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
    }

    await expect(
      createClient(new UnwritableStorage()).register(
        "Demo.User",
        "password-one",
      ),
    ).rejects.toMatchObject({
      status: 500,
      code: "REQUEST_FAILED",
    });
  });
});
