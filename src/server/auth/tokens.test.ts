import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccessToken,
  createRefreshToken,
  generateRefreshSessionId,
  hashRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens";

const claims = {
  userId: 42,
  username: "alice",
  role: "user",
} as const;

describe("server auth tokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an access token with the access token type", () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");

    const token = createAccessToken(claims, { expiresIn: "15m" });
    const payload = verifyAccessToken(token);

    expect(payload).toMatchObject({
      ...claims,
      tokenType: "access",
    });
  });

  it("creates a refresh token with a session id", () => {
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");

    const token = createRefreshToken(claims, "session-123", { expiresIn: "7d" });
    const payload = verifyRefreshToken(token);

    expect(payload).toMatchObject({
      ...claims,
      tokenType: "refresh",
      sessionId: "session-123",
    });
  });

  it("rejects a refresh token presented as an access token", () => {
    vi.stubEnv("REFRESH_TOKEN_SECRET", "refresh-test-secret");
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");

    const token = createRefreshToken(claims, "session-123");

    expect(verifyAccessToken(token)).toBeNull();
  });

  it("rejects tokens verified with the wrong secret", () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");

    const token = createAccessToken(claims);
    vi.stubEnv("ACCESS_TOKEN_SECRET", "different-secret");

    expect(verifyAccessToken(token)).toBeNull();
  });

  it("respects the configured default access token expiry", () => {
    vi.stubEnv("ACCESS_TOKEN_SECRET", "access-test-secret");
    vi.stubEnv("ACCESS_TOKEN_EXPIRES_IN", "15m");

    const token = createAccessToken(claims);
    const decoded = jwt.decode(token);

    expect(decoded).toMatchObject({
      tokenType: "access",
      userId: claims.userId,
    });

    if (typeof decoded !== "object" || decoded === null) {
      throw new Error("Expected decoded JWT payload");
    }

    expect(decoded.exp! - decoded.iat!).toBe(15 * 60);
  });

  it("generates unique refresh session ids", () => {
    const first = generateRefreshSessionId();
    const second = generateRefreshSessionId();

    expect(first).not.toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("hashes refresh tokens deterministically", () => {
    const token = "refresh-token-value";

    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(hashRefreshToken(`${token}-other`));
  });
});
