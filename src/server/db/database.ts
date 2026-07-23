import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import BetterSqlite3 from "better-sqlite3";

export type SqliteDatabase = BetterSqlite3.Database;

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        username_key TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX sessions_user_id_idx ON sessions(user_id);
      CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

      CREATE TABLE apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE INDEX apps_user_created_idx ON apps(user_id, created_at DESC, id DESC);
    `,
  },
] as const;

export function openDatabase(databasePath: string): SqliteDatabase {
  const resolvedPath =
    databasePath === ":memory:" ? databasePath : resolve(databasePath);

  if (resolvedPath !== ":memory:") {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const database = new BetterSqlite3(resolvedPath);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");

  if (resolvedPath !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  migrateDatabase(database);
  return database;
}

export function migrateDatabase(database: SqliteDatabase): void {
  const currentVersion = database.pragma("user_version", {
    simple: true,
  }) as number;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    database.transaction(() => {
      database.exec(migration.sql);
      database.pragma(`user_version = ${migration.version}`);
    })();
  }
}
