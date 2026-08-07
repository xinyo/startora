import { Temporal } from "@js-temporal/polyfill";
import type {
  AppItem,
  AppItemInput,
  AppReorderInput,
} from "../../types/contracts.js";
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
  sort_id: number;
  created_at: string;
  updated_at: string;
}

export interface AppCatalogModule {
  list(userId: number): AppItem[];
  create(userId: number, input: unknown): AppItem;
  update(userId: number, appId: number, input: unknown): AppItem;
  delete(userId: number, appId: number): void;
  reorder(userId: number, input: unknown): AppItem[];
}

const defaultClock: Clock = {
  now: () => Temporal.Now.instant(),
};

const iconPattern =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:svg|png|webp|jpe?g|avif)$/i;

function normalizeIcon(icon: string): string | null {
  try {
    const parsedUrl = new URL(icon);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return icon.length <= 2_048 ? parsedUrl.toString() : null;
    }
  } catch {
    // Bundled icons are stored as basenames rather than URLs.
  }

  if (
    iconPattern.test(icon) &&
    !icon.includes("..") &&
    !icon.includes("/") &&
    !icon.includes("\\")
  ) {
    return icon;
  }

  return null;
}

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
  const normalizedIcon = normalizeIcon(icon);
  if (normalizedIcon === null) {
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

  return {
    name,
    icon: normalizedIcon ?? icon,
    url: normalizedUrl,
    categoryId,
  };
}

function mapRow(row: AppRow): AppItem {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    url: row.url,
    categoryId: row.category_id,
    sortId: row.sort_id,
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
    SELECT id, name, icon, url, category_id, sort_id, created_at, updated_at
    FROM apps
    WHERE user_id = ?
    ORDER BY category_id, sort_id, id
  `);
  const findApp = database.prepare(`
    SELECT id, name, icon, url, category_id, sort_id, created_at, updated_at
    FROM apps
    WHERE id = ? AND user_id = ?
  `);
  const listGroup = database.prepare(`
    SELECT id, name, icon, url, category_id, sort_id, created_at, updated_at
    FROM apps
    WHERE user_id = ? AND category_id IS ?
    ORDER BY sort_id, id
  `);
  const insertApp = database.prepare(`
    INSERT INTO apps (
      user_id, name, icon, url, category_id, sort_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `);
  const updateApp = database.prepare(`
    UPDATE apps
    SET name = ?, icon = ?, url = ?, category_id = ?, sort_id = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  const updatePosition = database.prepare(`
    UPDATE apps
    SET category_id = ?, sort_id = ?, updated_at = ?
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

  const getGroup = (
    userId: number,
    categoryId: number | null,
  ): AppItem[] =>
    (listGroup.all(userId, categoryId) as AppRow[]).map(mapRow);

  const writeOrder = (
    userId: number,
    categoryId: number | null,
    orderedApps: AppItem[],
    now: string,
  ): void => {
    for (let index = 0; index < orderedApps.length; index++) {
      updatePosition.run(
        categoryId,
        index,
        now,
        orderedApps[index].id,
        userId,
      );
    }
  };

  const validateReorderInput = (
    input: unknown,
    userId: number,
  ): AppReorderInput => {
    const value =
      typeof input === "object" && input !== null
        ? (input as Record<string, unknown>)
        : {};
    const fields: Record<string, string> = {};
    const appId = value.appId;
    const position = value.position;
    const rawCategoryId = value.categoryId;

    if (!Number.isSafeInteger(appId) || Number(appId) <= 0) {
      fields.appId = "APP_ID_INVALID";
    }
    if (!Number.isSafeInteger(position) || Number(position) < 0) {
      fields.position = "APP_POSITION_INVALID";
    }

    let categoryId: number | null = null;
    if (rawCategoryId !== null) {
      if (!Number.isSafeInteger(rawCategoryId) || Number(rawCategoryId) <= 0) {
        fields.categoryId = "APP_CATEGORY_INVALID";
      } else {
        categoryId = Number(rawCategoryId);
        if (categories && !categories.belongsToUser(categoryId, userId)) {
          fields.categoryId = "CATEGORY_NOT_FOUND";
        }
      }
    }

    if (Object.keys(fields).length > 0) {
      throw validationError(fields);
    }

    return {
      appId: Number(appId),
      categoryId,
      position: Number(position),
    };
  };

  return {
    list(userId) {
      return (listApps.all(userId) as AppRow[]).map(mapRow);
    },

    create(userId, input) {
      const app = validateInput(input, categories, userId);
      const now = clock.now().toString();
      return database.transaction(() => {
        const categoryId = app.categoryId ?? null;
        const existing = getGroup(userId, categoryId);
        for (let index = existing.length - 1; index >= 0; index--) {
          updatePosition.run(
            categoryId,
            index + 1,
            now,
            existing[index].id,
            userId,
          );
        }
        const result = insertApp.run(
          userId,
          app.name,
          app.icon,
          app.url,
          categoryId,
          now,
          now,
        );
        return getOwnedApp(userId, Number(result.lastInsertRowid));
      })();
    },

    update(userId, appId, input) {
      const app = validateInput(input, categories, userId);
      const existing = getOwnedApp(userId, appId);
      const categoryId = app.categoryId ?? null;
      const now = clock.now().toString();

      return database.transaction(() => {
        if (existing.categoryId === categoryId) {
          updateApp.run(
            app.name,
            app.icon,
            app.url,
            categoryId,
            existing.sortId,
            now,
            appId,
            userId,
          );
        } else {
          const source = getGroup(userId, existing.categoryId).filter(
            (item) => item.id !== appId,
          );
          const target = getGroup(userId, categoryId);
          writeOrder(userId, existing.categoryId, source, now);
          for (let index = target.length - 1; index >= 0; index--) {
            updatePosition.run(
              categoryId,
              index + 1,
              now,
              target[index].id,
              userId,
            );
          }
          updateApp.run(
            app.name,
            app.icon,
            app.url,
            categoryId,
            0,
            now,
            appId,
            userId,
          );
        }
        return getOwnedApp(userId, appId);
      })();
    },

    delete(userId, appId) {
      const existing = getOwnedApp(userId, appId);
      database.transaction(() => {
        deleteApp.run(appId, userId);
        const remaining = getGroup(userId, existing.categoryId);
        writeOrder(
          userId,
          existing.categoryId,
          remaining,
          clock.now().toString(),
        );
      })();
    },

    reorder(userId, input) {
      const reorderInput = validateReorderInput(input, userId);
      const draggedApp = getOwnedApp(userId, reorderInput.appId);
      const sourceCategoryId = draggedApp.categoryId;
      const now = clock.now().toString();

      return database.transaction(() => {
        const source = getGroup(userId, sourceCategoryId).filter(
          (item) => item.id !== draggedApp.id,
        );
        const sameCategory = sourceCategoryId === reorderInput.categoryId;
        const target = sameCategory
          ? source
          : getGroup(userId, reorderInput.categoryId);

        if (reorderInput.position > target.length) {
          throw validationError({ position: "APP_POSITION_INVALID" });
        }

        const nextTarget = [...target];
        nextTarget.splice(reorderInput.position, 0, draggedApp);

        if (!sameCategory) {
          writeOrder(userId, sourceCategoryId, source, now);
        }
        writeOrder(userId, reorderInput.categoryId, nextTarget, now);

        return sameCategory
          ? getGroup(userId, reorderInput.categoryId)
          : [
              ...getGroup(userId, sourceCategoryId),
              ...getGroup(userId, reorderInput.categoryId),
            ];
      })();
    },
  };
}
