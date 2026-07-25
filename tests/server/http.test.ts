import { Temporal } from "@js-temporal/polyfill";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppCatalogModule } from "../../src/server/apps/module.js";
import { createAuthModule } from "../../src/server/auth/module.js";
import { openDatabase } from "../../src/server/db/database.js";
import type { SqliteDatabase } from "../../src/server/db/database.js";
import { createHttpApp } from "../../src/server/http/app.js";

const origin = "http://localhost:5173";

describe("Express HTTP adapter", () => {
  let database: SqliteDatabase;
  let app: ReturnType<typeof createHttpApp>;

  beforeEach(() => {
    database = openDatabase(":memory:");
    const clock = {
      now: () => Temporal.Instant.from("2026-07-23T00:00:00Z"),
    };
    app = createHttpApp({
      auth: createAuthModule(database, {
        clock,
        generateToken: () => "http-test-token",
      }),
      apps: createAppCatalogModule(database, clock),
      appOrigin: origin,
      secureCookies: true,
    });
  });

  afterEach(() => {
    database.close();
  });

  it("registers, sets a secure cookie, restores the session, and logs out", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .set("Origin", origin)
      .send({ username: "Http.User", password: "password-one" })
      .expect(201);

    const cookie = registration.headers["set-cookie"][0] as string;
    expect(cookie).toContain("startora_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(registration.body.user).toEqual({ id: 1, username: "Http.User" });

    await request(app)
      .get("/api/auth/session")
      .set("Cookie", cookie)
      .expect(200, { user: { id: 1, username: "Http.User" } });

    await request(app)
      .post("/api/auth/logout")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .expect(204);

    await request(app)
      .get("/api/auth/session")
      .set("Cookie", cookie)
      .expect(401);
  });

  it("rejects mutations from another origin", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("Origin", "https://attacker.example")
      .send({ username: "Http.User", password: "password-one" })
      .expect(403)
      .expect(({ body }) => {
        expect(body.error.code).toBe("ORIGIN_REJECTED");
      });
  });

  it("supports authenticated app CRUD and JSON validation failures", async () => {
    const registration = await request(app)
      .post("/api/auth/register")
      .set("Origin", origin)
      .send({ username: "Http.User", password: "password-one" });
    const cookie = registration.headers["set-cookie"][0] as string;

    const creation = await request(app)
      .post("/api/apps")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({
        name: "Docs",
        icon: "default-app.svg",
        url: "https://docs.example.com",
      })
      .expect(201);

    const appId = creation.body.app.id as number;
    await request(app)
      .get("/api/apps")
      .set("Cookie", cookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body.apps).toHaveLength(1);
      });

    await request(app)
      .put(`/api/apps/${appId}`)
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({
        name: "Updated",
        icon: "default-app.svg",
        url: "https://updated.example.com",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.app.name).toBe("Updated");
      });

    await request(app)
      .post("/api/apps")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({ name: "", icon: "bad.exe", url: "not-a-url" })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.code).toBe("VALIDATION_ERROR");
      });

    await request(app)
      .delete(`/api/apps/${appId}`)
      .set("Origin", origin)
      .set("Cookie", cookie)
      .expect(204);
  });
});
