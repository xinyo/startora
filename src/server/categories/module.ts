import { Temporal } from "@js-temporal/polyfill";
import type { CategoryItem, CategoryItemInput } from "../../types/contracts.js";
import type { Clock } from "../auth/module.js";
import type { SqliteDatabase } from "../db/database.js";
import { notFoundError, validationError } from "../errors.js";

interface CategoryRow {
  id: number;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CategoriesModule {
  list(userId: number): CategoryItem[];
  create(userId: number, input: unknown): CategoryItem;
  update(userId: number, categoryId: number, input: unknown): CategoryItem;
  delete(userId: number, categoryId: number): void;
  reorder(userId: number, orderedIds: number[]): void;
  belongsToUser(categoryId: number, userId: number): boolean;
}

const defaultClock: Clock = {
  now: () => Temporal.Now.instant(),
};

function validateInput(input: unknown): CategoryItemInput {
  const value =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const position =
    typeof value.position === "number" ? value.position : undefined;
  const fields: Record<string, string> = {};

  if (name.length < 1 || name.length > 100) {
    fields.name = "CATEGORY_NAME_INVALID";
  }

  if (Object.keys(fields).length > 0) {
    throw validationError(fields);
  }

  return { name, position };
}

function mapRow(row: CategoryRow): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCategoriesModule(
  database: SqliteDatabase,
  clock: Clock = defaultClock,
): CategoriesModule {
  const listCategories = database.prepare(`
    SELECT id, name, position, created_at, updated_at
    FROM categories
    WHERE user_id = ?
    ORDER BY position, id
  `);
  const findCategory = database.prepare(`
    SELECT id, name, position, created_at, updated_at
    FROM categories
    WHERE id = ? AND user_id = ?
  `);
  const lookupCategory = database.prepare(`
    SELECT id FROM categories WHERE id = ? AND user_id = ?
  `);
  const maxPosition = database.prepare(`
    SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
    FROM categories
    WHERE user_id = ?
  `);
  const insertCategory = database.prepare(`
    INSERT INTO categories (user_id, name, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const updateCategory = database.prepare(`
    UPDATE categories
    SET name = ?, position = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  const deleteCategory = database.prepare(
    "DELETE FROM categories WHERE id = ? AND user_id = ?",
  );
  const listCategoryApps = database.prepare(`
    SELECT id FROM apps
    WHERE user_id = ? AND category_id IS ?
    ORDER BY sort_id, id
  `);
  const updateAppPosition = database.prepare(`
    UPDATE apps
    SET category_id = ?, sort_id = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);
  const updatePosition = database.prepare(`
    UPDATE categories SET position = ?, updated_at = ? WHERE id = ? AND user_id = ?
  `);

  const getOwnedCategory = (
    userId: number,
    categoryId: number,
  ): CategoryItem => {
    const row = findCategory.get(categoryId, userId) as CategoryRow | undefined;
    if (!row) {
      throw notFoundError();
    }
    return mapRow(row);
  };

  return {
    list(userId) {
      return (listCategories.all(userId) as CategoryRow[]).map(mapRow);
    },

    create(userId, input) {
      const cat = validateInput(input);
      const now = clock.now().toString();
      const position =
        cat.position ??
        (maxPosition.get(userId) as { next_pos: number }).next_pos;
      const result = insertCategory.run(userId, cat.name, position, now, now);
      return getOwnedCategory(userId, Number(result.lastInsertRowid));
    },

    update(userId, categoryId, input) {
      const cat = validateInput(input);
      const now = clock.now().toString();
      const result = updateCategory.run(
        cat.name,
        cat.position ?? 0,
        now,
        categoryId,
        userId,
      );
      if (result.changes === 0) {
        throw notFoundError();
      }
      return getOwnedCategory(userId, categoryId);
    },

    delete(userId, categoryId) {
      if (!lookupCategory.get(categoryId, userId)) {
        throw notFoundError();
      }

      database.transaction(() => {
        const now = clock.now().toString();
        const movedApps = listCategoryApps.all(userId, categoryId) as Array<{
          id: number;
        }>;
        const uncategorized = listCategoryApps.all(userId, null) as Array<{
          id: number;
        }>;

        for (let index = uncategorized.length - 1; index >= 0; index--) {
          updateAppPosition.run(
            null,
            movedApps.length + index,
            now,
            uncategorized[index].id,
            userId,
          );
        }
        for (let index = 0; index < movedApps.length; index++) {
          updateAppPosition.run(null, index, now, movedApps[index].id, userId);
        }

        deleteCategory.run(categoryId, userId);
      })();
    },

    reorder(userId, orderedIds) {
      const now = clock.now().toString();
      database.transaction(() => {
        for (let index = 0; index < orderedIds.length; index++) {
          const result = updatePosition.run(
            index,
            now,
            orderedIds[index],
            userId,
          );
          if (result.changes === 0) {
            throw notFoundError();
          }
        }
      })();
    },

    belongsToUser(categoryId, userId) {
      const row = lookupCategory.get(categoryId, userId) as
        | { id: number }
        | undefined;
      return Boolean(row);
    },
  };
}
