import { Temporal } from "@js-temporal/polyfill";
import type { AppItem, AppItemInput } from "../../types/contracts.js";
import type { Clock } from "../auth/module.js";
import type { SqliteDatabase } from "../db/database.js";
import { notFoundError, validationError } from "../errors.js";
import type { CategoriesModule } from "../categories/module.js";

interface AppRow {
  id: number;
  name: string;
  icon: string;
  url: string;
  category_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppCatalogModule {
  list(userId: number): AppItem[];
  create(userId: number, input: unknown): AppItem;
  update(userId: number, appId: number, input: unknown): AppItem;
  delete(userId: number, appId: number): void;
}

const defaultClock: Clock = {
  now: () => Temporal.Now.instant(),
};

const iconPattern =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:svg|png|webp|jpe?g|avif)$/i;

function validateInput(
  input: unknown,
  categories?: CategoriesModule,
  userId?: number,
): AppItemInput {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const icon = typeof value.icon === "string" ? value.icon.trim() : "";
  const url = typeof value.url === "string" ? value.url.trim() : "";
  const rawCategoryId = value.categoryId;
  const fields: Record<string, string> = {};

  if (name.length < 1 || name.length > 100) {
    fields.name = "APP_NAME_INVALID";
  }
  if (
    !iconPattern.test(icon) ||
    icon.includes("..") ||
    icon.includes("/") ||
    icon.includes("\\")
  ) {
    fields.icon = "APP_ICON_INVALID";
  }

  let normalizedUrl = url;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      fields.url = "APP_URL_INVALID";
    } else {
      normalizedUrl = parsedUrl.toString();
    }
  } catch {
    fields.url = "APP_URL_INVALID";
  }

  if (url.length > 2_048) {
    fields.url = "APP_URL_INVALID";
  }

  let categoryId: number | null = null;
  if (rawCategoryId !== undefined && rawCategoryId !== null) {
    const parsedId = Number(rawCategoryId);
    if (
      !Number.isSafeInteger(parsedId) ||
      parsedId <= 0 ||
      !Number.isFinite(parsedId)
    ) {
      fields.categoryId = "APP_CATEGORY_INVALID";
    } else if (
      categories &&
      userId !== undefined &&
      !categories.belongsToUser(parsedId, userId)
    ) {
      fields.categoryId = "CATEGORY_NOT_FOUND";
    } else {
      categoryId = parsedId;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw validationError(fields);
  }

  return { name, icon, url: normalizedUrl, categoryId };
}

function mapRow(row: AppRow): AppItem {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    url: row.url,
    categoryId: row.category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createAppCatalogModule(
  database: SqliteDatabase,
  clock: Clock = defaultClock,
  categories?: CategoriesModule,
): AppCatalogModule {
  const listApps = database.prepare(`
    SELECT id, name, icon, url, category_id, created_at, updated_at
    FROM apps
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
  `);
  const findApp = database.prepare(`
    SELECT id, name, icon, url, category_id, created_at, updated_at
    FROM apps
    WHERE id = ? AND user_id = ?
  `);
  const insertApp = database.prepare(`
    INSERT INTO apps (user_id, name, icon, url, category_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateApp = database.prepare(`
    UPDATE apps
    SET name = ?, icon = ?, url = ?, category_id = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  const deleteApp = database.prepare(
    "DELETE FROM apps WHERE id = ? AND user_id = ?",
  );

  const getOwnedApp = (userId: number, appId: number): AppItem => {
    const row = findApp.get(appId, userId) as AppRow | undefined;
    if (!row) {
      throw notFoundError();
    }
    return mapRow(row);
  };

  return {
    list(userId) {
      return (listApps.all(userId) as AppRow[]).map(mapRow);
    },

    create(userId, input) {
      const app = validateInput(input, categories, userId);
      const now = clock.now().toString();
      const result = insertApp.run(
        userId,
        app.name,
        app.icon,
        app.url,
        app.categoryId ?? null,
        now,
        now,
      );
      return getOwnedApp(userId, Number(result.lastInsertRowid));
    },

    update(userId, appId, input) {
      const app = validateInput(input, categories, userId);
      const result = updateApp.run(
        app.name,
        app.icon,
        app.url,
        app.categoryId ?? null,
        clock.now().toString(),
        appId,
        userId,
      );
      if (result.changes === 0) {
        throw notFoundError();
      }
      return getOwnedApp(userId, appId);
    },

    delete(userId, appId) {
      const result = deleteApp.run(appId, userId);
      if (result.changes === 0) {
        throw notFoundError();
      }
    },
  };
}
