import bcrypt from "bcrypt";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearRefreshCookie,
  createRefreshCookie,
  ensureAuthenticatedUserMatchesParam,
  handleLogin,
  handleLogout,
  handleRefresh,
  parseCookies,
} from "./service";
import {
  createRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens";

function createMockResponse() {
  return {
    headers: {} as Record<string, string>,
    statusCode: 200,
    jsonBody: undefined as unknown,
    sentBody: undefined as unknown,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
    send(body?: unknown) {
      this.sentBody = body;
      return this;
    },
  };
}

describe("server auth service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("issues an access token and refresh cookie on login", async () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");

    const passwordHash = await bcrypt.hash("secret-password", 4);
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: 7, username: "alice", password: passwordHash }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const client = { query } as any;
    const req = {
      body: { username: "alice", password: "secret-password" },
      headers: {},
    };
    const res = createMockResponse();

    await handleLogin(req, res, client);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Set-Cookie"]).toContain("HttpOnly");
    expect(res.headers["Set-Cookie"]).toContain("Path=/auth/refresh");
    expect(res.headers["Set-Cookie"]).toContain("refreshToken=");
    expect(res.jsonBody).toMatchObject({
      success: true,
      user: { id: 7, username: "alice" },
    });

    const body = res.jsonBody as Record<string, string>;
    const accessPayload = verifyAccessToken(body.accessToken);
    expect(accessPayload).toMatchObject({
      userId: 7,
      username: "alice",
      tokenType: "access",
    });

    const insertCall = query.mock.calls[1];
    expect(insertCall[0]).toContain("INSERT INTO refresh_sessions");
    expect(insertCall[1][0]).toEqual(expect.any(String));
    expect(insertCall[1][1]).toBe(7);
    expect(insertCall[1][2]).toMatch(/^[0-9a-f]{64}$/);
    expect(insertCall[1][3]).toBeInstanceOf(Date);
  });

  it("refreshes an access token and rotates the refresh session hash", async () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");

    const refreshToken = createRefreshToken(
      { userId: 8, username: "bob", role: "user" },
      "session-1",
    );
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{
          session_id: "session-1",
          user_id: 8,
          token_hash: hashRefreshToken(refreshToken),
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const client = { query } as any;
    const req = {
      headers: {
        cookie: createRefreshCookie(refreshToken),
      },
    };
    const res = createMockResponse();

    await handleRefresh(req, res, client);

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toMatchObject({
      success: true,
      user: { id: 8, username: "bob" },
    });

    const body = res.jsonBody as Record<string, string>;
    expect(verifyAccessToken(body.accessToken)).toMatchObject({
      userId: 8,
      tokenType: "access",
    });

    const rotatedCookie = res.headers["Set-Cookie"];
    const nextRefreshToken = parseCookies(rotatedCookie).refreshToken;
    expect(nextRefreshToken).toBeTruthy();
    expect(nextRefreshToken).not.toBe(refreshToken);

    const refreshPayload = verifyRefreshToken(nextRefreshToken!);
    expect(refreshPayload).toMatchObject({
      userId: 8,
      sessionId: "session-1",
      tokenType: "refresh",
    });

    const updateCall = query.mock.calls[1];
    expect(updateCall[0]).toContain("UPDATE refresh_sessions");
    expect(updateCall[1][0]).toBe("session-1");
    expect(updateCall[1][1]).toBe(hashRefreshToken(nextRefreshToken!));
    expect(updateCall[1][2]).toBeInstanceOf(Date);
  });

  it("rejects refresh when the persisted session hash does not match", async () => {
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");

    const refreshToken = createRefreshToken(
      { userId: 9, username: "carol", role: "user" },
      "session-2",
    );
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{
          session_id: "session-2",
          user_id: 9,
          token_hash: hashRefreshToken("different-token"),
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const client = { query } as any;
    const req = {
      headers: {
        cookie: createRefreshCookie(refreshToken),
      },
    };
    const res = createMockResponse();

    await handleRefresh(req, res, client);

    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toMatchObject({
      success: false,
      error: "Refresh session is invalid",
    });
    expect(res.headers["Set-Cookie"]).toBe(clearRefreshCookie());
    expect(query.mock.calls[1][0]).toContain("UPDATE refresh_sessions");
  });

  it("clears the refresh cookie and revokes the session on logout", async () => {
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");

    const refreshToken = createRefreshToken(
      { userId: 10, username: "dave", role: "user" },
      "session-3",
    );
    const query = vi.fn().mockResolvedValue({ rows: [] });

    const client = { query } as any;
    const req = {
      headers: {
        cookie: createRefreshCookie(refreshToken),
      },
    };
    const res = createMockResponse();

    await handleLogout(req, res, client);

    expect(res.statusCode).toBe(204);
    expect(res.headers["Set-Cookie"]).toBe(clearRefreshCookie());
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("UPDATE refresh_sessions");
    expect(query.mock.calls[0][1]).toEqual(["session-3"]);
  });

  it("forbids access when the route user id does not match the authenticated user", () => {
    const middleware = ensureAuthenticatedUserMatchesParam();
    const req = {
      user: { userId: 5 },
      params: { userid: "6" },
    };
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual({ error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});
