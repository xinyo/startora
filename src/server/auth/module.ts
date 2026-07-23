import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import type { User } from "../../types/contracts.js";
import type { SqliteDatabase } from "../db/database.js";
import {
  AppError,
  unauthorizedError,
  validationError,
} from "../errors.js";

const SESSION_HOURS = 7 * 24;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

interface SessionRow {
  token_hash: string;
  user_id: number;
  expires_at: string;
  username: string;
}

export interface Clock {
  now(): Temporal.Instant;
}

export interface AuthModuleDependencies {
  clock?: Clock;
  generateToken?: () => string;
}

export interface AuthResult {
  user: User;
  token: string;
  expiresAt: string;
}

export interface AuthenticatedSession {
  user: User;
  expiresAt: string;
}

export interface AuthModule {
  register(credentials: {
    username: unknown;
    password: unknown;
  }): Promise<AuthResult>;
  login(credentials: {
    username: unknown;
    password: unknown;
  }): Promise<AuthResult>;
  authenticate(token: string | null): AuthenticatedSession;
  logout(token: string | null): void;
}

const systemClock: Clock = {
  now: () => Temporal.Now.instant(),
};

function deriveKey(
  password: string,
  salt: string,
  options = SCRYPT_OPTIONS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, salt);
  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, expected] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    !n ||
    !r ||
    !p ||
    !salt ||
    !expected
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "base64url");
  const actualBuffer = await deriveKey(password, salt, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT_OPTIONS.maxmem,
  });

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function validateCredentials(credentials: {
  username: unknown;
  password: unknown;
}): { username: string; password: string; usernameKey: string } {
  const username =
    typeof credentials.username === "string" ? credentials.username.trim() : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : "";
  const fields: Record<string, string> = {};

  if (!USERNAME_PATTERN.test(username)) {
    fields.username = "USERNAME_INVALID";
  }
  if (password.length < 8 || password.length > 128) {
    fields.password = "PASSWORD_INVALID";
  }
  if (Object.keys(fields).length > 0) {
    throw validationError(fields);
  }

  return { username, password, usernameKey: username.toLowerCase() };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthModule(
  database: SqliteDatabase,
  dependencies: AuthModuleDependencies = {},
): AuthModule {
  const clock = dependencies.clock ?? systemClock;
  const generateToken =
    dependencies.generateToken ?? (() => randomBytes(32).toString("base64url"));

  const insertUser = database.prepare(`
    INSERT INTO users (username, username_key, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const findUser = database.prepare(`
    SELECT id, username, password_hash
    FROM users
    WHERE username_key = ?
  `);
  const insertSession = database.prepare(`
    INSERT INTO sessions (
      token_hash, user_id, expires_at, created_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  const findSession = database.prepare(`
    SELECT
      sessions.token_hash,
      sessions.user_id,
      sessions.expires_at,
      users.username
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `);
  const updateSession = database.prepare(`
    UPDATE sessions
    SET expires_at = ?, last_seen_at = ?
    WHERE token_hash = ?
  `);
  const deleteSession = database.prepare(
    "DELETE FROM sessions WHERE token_hash = ?",
  );
  const deleteExpiredSessions = database.prepare(
    "DELETE FROM sessions WHERE expires_at <= ?",
  );

  function issueSession(user: User): AuthResult {
    const token = generateToken();
    const now = clock.now();
    const expiresAt = now.add({ hours: SESSION_HOURS }).toString();
    insertSession.run(
      hashToken(token),
      user.id,
      expiresAt,
      now.toString(),
      now.toString(),
    );
    return { user, token, expiresAt };
  }

  return {
    async register(credentials) {
      const { username, usernameKey, password } =
        validateCredentials(credentials);
      const passwordHash = await hashPassword(password);
      const now = clock.now().toString();

      try {
        const result = database.transaction(() => {
          const insertion = insertUser.run(
            username,
            usernameKey,
            passwordHash,
            now,
          );
          const user = { id: Number(insertion.lastInsertRowid), username };
          return issueSession(user);
        })();
        return result;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint failed")
        ) {
          throw new AppError(
            409,
            "USERNAME_TAKEN",
            "That username is already in use.",
          );
        }
        throw error;
      }
    },

    async login(credentials) {
      const { usernameKey, password } = validateCredentials(credentials);
      const row = findUser.get(usernameKey) as UserRow | undefined;

      if (!row || !(await verifyPassword(password, row.password_hash))) {
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "The username or password is incorrect.",
        );
      }

      return issueSession({ id: row.id, username: row.username });
    },

    authenticate(token) {
      if (!token) {
        throw unauthorizedError();
      }

      const now = clock.now();
      deleteExpiredSessions.run(now.toString());
      const tokenHash = hashToken(token);
      const row = findSession.get(tokenHash) as SessionRow | undefined;

      if (!row) {
        throw unauthorizedError();
      }

      const expiresAt = Temporal.Instant.from(row.expires_at);
      if (Temporal.Instant.compare(expiresAt, now) <= 0) {
        deleteSession.run(tokenHash);
        throw unauthorizedError();
      }

      const nextExpiry = now.add({ hours: SESSION_HOURS }).toString();
      updateSession.run(nextExpiry, now.toString(), tokenHash);
      return {
        user: { id: row.user_id, username: row.username },
        expiresAt: nextExpiry,
      };
    },

    logout(token) {
      if (token) {
        deleteSession.run(hashToken(token));
      }
    },
  };
}
