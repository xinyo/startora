import { Temporal } from "@js-temporal/polyfill";
import BetterSqlite3 from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppCatalogModule } from "../../src/server/apps/module.js";
import { createCategoriesModule } from "../../src/server/categories/module.js";
import {
  migrateDatabase,
  openDatabase,
} from "../../src/server/db/database.js";
import type { SqliteDatabase } from "../../src/server/db/database.js";

describe("app catalog module", () => {
  let database: SqliteDatabase;
  let now: Temporal.Instant;

  beforeEach(() => {
    database = openDatabase(":memory:");
    database
      .prepare(
        "INSERT INTO users (username, username_key, password_hash, created_at) VALUES (?, ?, ?, ?)",
      )
      .run("One", "one", "hash", "2026-07-23T00:00:00Z");
    database
      .prepare(
        "INSERT INTO users (username, username_key, password_hash, created_at) VALUES (?, ?, ?, ?)",
      )
      .run("Two", "two", "hash", "2026-07-23T00:00:00Z");
    now = Temporal.Instant.from("2026-07-23T00:00:00Z");
  });

  afterEach(() => {
    database.close();
  });

  it("migrates an empty database and supports full CRUD newest-first", () => {
    expect(database.pragma("user_version", { simple: true })).toBe(3);
    const apps = createAppCatalogModule(database, { now: () => now });

    const first = apps.create(1, {
      name: "Docs",
      icon: "default-app.svg",
      url: "https://docs.example.com",
    });
    now = now.add({ seconds: 1 });
    const second = apps.create(1, {
      name: "Status",
      icon: "status.webp",
      url: "https://status.example.com/path",
    });

    expect(apps.list(1).map((appItem) => appItem.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(apps.list(1).map((appItem) => appItem.sortId)).toEqual([0, 1]);

    const updated = apps.update(1, first.id, {
      name: "Documentation",
      icon: "default-app.svg",
      url: "https://docs.example.com/start",
    });
    expect(updated.name).toBe("Documentation");
    expect(updated.url).toBe("https://docs.example.com/start");

    apps.delete(1, second.id);
    expect(apps.list(1)).toEqual([{ ...updated, sortId: 0 }]);
  });

  it("does not reveal or mutate another user's apps", () => {
    const apps = createAppCatalogModule(database, { now: () => now });
    const appItem = apps.create(1, {
      name: "Private",
      icon: "default-app.svg",
      url: "https://private.example.com",
    });

    expect(apps.list(2)).toEqual([]);
    expect(() =>
      apps.update(2, appItem.id, {
        name: "Taken",
        icon: "default-app.svg",
        url: "https://example.com",
      }),
    ).toThrowError(expect.objectContaining({ status: 404 }));
    expect(() => apps.delete(2, appItem.id)).toThrowError(
      expect.objectContaining({ status: 404 }),
    );
  });

  it("stores bundled icon basenames and normalized remote icon URLs", () => {
    const apps = createAppCatalogModule(database, { now: () => now });
    const remoteIconUrl =
      "https://cdn.example.com/icons/docs.svg?version=1";

    const appItem = apps.create(1, {
      name: "Remote icon",
      icon: remoteIconUrl,
      url: "https://example.com",
    });

    expect(appItem.icon).toBe(remoteIconUrl);
    expect(apps.list(1)[0]?.icon).toBe(remoteIconUrl);
  });

  it("validates app names, icon basenames or URLs, and app URLs", () => {
    const apps = createAppCatalogModule(database, { now: () => now });

    expect(() =>
      apps.create(1, {
        name: "",
        icon: "../unsafe.svg",
        url: "javascript:alert(1)",
      }),
    ).toThrowError(
      expect.objectContaining({
        status: 400,
        fields: {
          name: "APP_NAME_INVALID",
          icon: "APP_ICON_INVALID",
          url: "APP_URL_INVALID",
        },
      }),
    );

    expect(() =>
      apps.create(1, {
        name: "Unsafe icon URL",
        icon: "data:image/svg+xml,<svg></svg>",
        url: "https://example.com",
      }),
    ).toThrowError(
      expect.objectContaining({
        status: 400,
        fields: {
          icon: "APP_ICON_INVALID",
        },
      }),
    );
  });

  it("backfills sort ids using the legacy newest-first order", () => {
    const legacy = new BetterSqlite3(":memory:");
    try {
      legacy.exec(`
        CREATE TABLE apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          url TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          category_id INTEGER
        ) STRICT;
        INSERT INTO apps (
          user_id, name, icon, url, created_at, updated_at, category_id
        ) VALUES
          (1, 'Older', 'default-app.svg', 'https://older.example.com',
            '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', NULL),
          (1, 'Newer', 'default-app.svg', 'https://newer.example.com',
            '2026-02-01T00:00:00Z', '2026-02-01T00:00:00Z', NULL),
          (1, 'Categorized', 'default-app.svg', 'https://cat.example.com',
            '2026-01-15T00:00:00Z', '2026-01-15T00:00:00Z', 4);
      `);
      legacy.pragma("user_version = 2");

      migrateDatabase(legacy);

      expect(legacy.pragma("user_version", { simple: true })).toBe(3);
      expect(
        legacy
          .prepare("SELECT name, sort_id FROM apps ORDER BY id")
          .all(),
      ).toEqual([
        { name: "Older", sort_id: 1 },
        { name: "Newer", sort_id: 0 },
        { name: "Categorized", sort_id: 0 },
      ]);
    } finally {
      legacy.close();
    }
  });

  it("reorders within and across categories and rejects invalid targets", () => {
    const categories = createCategoriesModule(database, { now: () => now });
    const sourceCategory = categories.create(1, { name: "Source" });
    const targetCategory = categories.create(1, { name: "Target" });
    const apps = createAppCatalogModule(
      database,
      { now: () => now },
      categories,
    );
    const first = apps.create(1, {
      name: "First",
      icon: "default-app.svg",
      url: "https://first.example.com",
      categoryId: sourceCategory.id,
    });
    const second = apps.create(1, {
      name: "Second",
      icon: "default-app.svg",
      url: "https://second.example.com",
      categoryId: sourceCategory.id,
    });
    const target = apps.create(1, {
      name: "Target app",
      icon: "default-app.svg",
      url: "https://target.example.com",
      categoryId: targetCategory.id,
    });

    apps.reorder(1, {
      appId: second.id,
      categoryId: sourceCategory.id,
      position: 1,
    });
    expect(
      apps
        .list(1)
        .filter((item) => item.categoryId === sourceCategory.id)
        .map((item) => [item.id, item.sortId]),
    ).toEqual([
      [first.id, 0],
      [second.id, 1],
    ]);

    apps.reorder(1, {
      appId: second.id,
      categoryId: targetCategory.id,
      position: 1,
    });
    expect(
      apps
        .list(1)
        .filter((item) => item.categoryId === sourceCategory.id)
        .map((item) => [item.id, item.sortId]),
    ).toEqual([[first.id, 0]]);
    expect(
      apps
        .list(1)
        .filter((item) => item.categoryId === targetCategory.id)
        .map((item) => [item.id, item.sortId]),
    ).toEqual([
      [target.id, 0],
      [second.id, 1],
    ]);

    expect(() =>
      apps.reorder(1, {
        appId: first.id,
        categoryId: targetCategory.id,
        position: 3,
      }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() =>
      apps.reorder(2, {
        appId: first.id,
        categoryId: null,
        position: 0,
      }),
    ).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it("puts non-drag category moves at the top and reindexes after deletion", () => {
    const categories = createCategoriesModule(database, { now: () => now });
    const category = categories.create(1, { name: "Tools" });
    const apps = createAppCatalogModule(
      database,
      { now: () => now },
      categories,
    );
    const existing = apps.create(1, {
      name: "Existing",
      icon: "default-app.svg",
      url: "https://existing.example.com",
      categoryId: category.id,
    });
    const moved = apps.create(1, {
      name: "Moved",
      icon: "default-app.svg",
      url: "https://moved.example.com",
    });

    apps.update(1, moved.id, {
      name: moved.name,
      icon: moved.icon,
      url: moved.url,
      categoryId: category.id,
    });
    expect(
      apps
        .list(1)
        .filter((item) => item.categoryId === category.id)
        .map((item) => [item.id, item.sortId]),
    ).toEqual([
      [moved.id, 0],
      [existing.id, 1],
    ]);

    apps.delete(1, moved.id);
    expect(apps.list(1).find((item) => item.id === existing.id)?.sortId).toBe(0);
  });

  it("moves a deleted category to the top of uncategorized in order", () => {
    const categories = createCategoriesModule(database, { now: () => now });
    const category = categories.create(1, { name: "Temporary" });
    const apps = createAppCatalogModule(
      database,
      { now: () => now },
      categories,
    );
    const uncategorized = apps.create(1, {
      name: "Uncategorized",
      icon: "default-app.svg",
      url: "https://uncategorized.example.com",
    });
    const older = apps.create(1, {
      name: "Older category app",
      icon: "default-app.svg",
      url: "https://older-category.example.com",
      categoryId: category.id,
    });
    const newer = apps.create(1, {
      name: "Newer category app",
      icon: "default-app.svg",
      url: "https://newer-category.example.com",
      categoryId: category.id,
    });

    categories.delete(1, category.id);

    expect(apps.list(1).map((item) => [item.id, item.categoryId, item.sortId])).toEqual([
      [newer.id, null, 0],
      [older.id, null, 1],
      [uncategorized.id, null, 2],
    ]);
  });
});
