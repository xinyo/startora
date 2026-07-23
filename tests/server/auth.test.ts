import { Temporal } from "@js-temporal/polyfill";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuthModule } from "../../src/server/auth/module.js";
import type { Clock } from "../../src/server/auth/module.js";
import { openDatabase } from "../../src/server/db/database.js";
import type { SqliteDatabase } from "../../src/server/db/database.js";
import { AppError } from "../../src/server/errors.js";

describe("authentication module", () => {
  let database: SqliteDatabase;
  let now: Temporal.Instant;
  let tokenIndex: number;
  let clock: Clock;

  beforeEach(() => {
    database = openDatabase(":memory:");
    now = Temporal.Instant.from("2026-07-23T00:00:00Z");
    tokenIndex = 0;
    clock = { now: () => now };
  });

  afterEach(() => {
    database.close();
  });

  const createModule = () =>
    createAuthModule(database, {
      clock,
      generateToken: () => `test-token-${++tokenIndex}`,
    });

  it("registers a user with a password hash and authenticates its session", async () => {
    const auth = createModule();
    const result = await auth.register({
      username: "Ada.Lovelace",
      password: "correct horse battery staple",
    });

    expect(result.user).toEqual({ id: 1, username: "Ada.Lovelace" });
    expect(result.token).toBe("test-token-1");
    const stored = database
      .prepare("SELECT password_hash, username_key FROM users WHERE id = 1")
      .get() as { password_hash: string; username_key: string };
    expect(stored.password_hash).toMatch(/^scrypt\$/);
    expect(stored.password_hash).not.toContain("correct horse battery staple");
    expect(stored.username_key).toBe("ada.lovelace");
    expect(auth.authenticate(result.token).user).toEqual(result.user);
  });

  it("rejects case-only duplicate usernames", async () => {
    const auth = createModule();
    await auth.register({ username: "Startora", password: "password-one" });

    await expect(
      auth.register({ username: "STARTORA", password: "password-two" }),
    ).rejects.toMatchObject({
      status: 409,
      code: "USERNAME_TAKEN",
    });
  });

  it("logs in case-insensitively and returns one generic credentials error", async () => {
    const auth = createModule();
    await auth.register({ username: "Mixed.Case", password: "password-one" });

    const login = await auth.login({
      username: "mixed.case",
      password: "password-one",
    });
    expect(login.user.username).toBe("Mixed.Case");

    await expect(
      auth.login({ username: "mixed.case", password: "not-the-password" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
    await expect(
      auth.login({ username: "missing.user", password: "not-the-password" }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  it("rolls active sessions, expires inactive sessions, and revokes logout", async () => {
    const auth = createModule();
    const first = await auth.register({
      username: "session.user",
      password: "password-one",
    });

    now = now.add({ hours: 24 });
    const active = auth.authenticate(first.token);
    expect(active.expiresAt).toBe("2026-07-31T00:00:00Z");

    now = now.add({ hours: 8 * 24 });
    expect(() => auth.authenticate(first.token)).toThrow(AppError);

    const second = await auth.login({
      username: "session.user",
      password: "password-one",
    });
    auth.logout(second.token);
    expect(() => auth.authenticate(second.token)).toThrow(AppError);
  });

  it("validates usernames and password lengths at the interface", async () => {
    const auth = createModule();

    await expect(
      auth.register({ username: "no spaces", password: "short" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      fields: {
        username: "USERNAME_INVALID",
        password: "PASSWORD_INVALID",
      },
    });
  });
});
