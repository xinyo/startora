import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppCatalogModule } from "../../src/server/apps/module.js";
import { openDatabase } from "../../src/server/db/database.js";
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
    expect(database.pragma("user_version", { simple: true })).toBe(2);
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

    const updated = apps.update(1, first.id, {
      name: "Documentation",
      icon: "default-app.svg",
      url: "https://docs.example.com/start",
    });
    expect(updated.name).toBe("Documentation");
    expect(updated.url).toBe("https://docs.example.com/start");

    apps.delete(1, second.id);
    expect(apps.list(1)).toEqual([updated]);
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

  it("validates app names, safe icon basenames, and HTTP(S) URLs", () => {
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
  });
});
