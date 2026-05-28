import bcrypt from "bcrypt";
import { Client } from "pg";
import {
  createRefreshSession,
  getRefreshSession,
  isRefreshSessionActive,
  revokeRefreshSession,
  rotateRefreshSession,
} from "./refresh-sessions";
import {
  type AuthTokenClaims,
  createAccessToken,
  createRefreshToken,
  generateRefreshSessionId,
  hashRefreshToken,
  verifyRefreshToken,
} from "./tokens";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/auth/refresh";
const DEFAULT_REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getRefreshCookieMaxAgeMs(): number {
  const configured = process.env.REFRESH_COOKIE_MAX_AGE_MS;
  if (!configured) {
    return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
  }

  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    path: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    maxAge?: number;
  },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`];

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  }

  return parts.join("; ");
}

export function createRefreshCookie(token: string): string {
  return serializeCookie(REFRESH_COOKIE_NAME, token, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "Strict",
    maxAge: getRefreshCookieMaxAgeMs(),
  });
}

export function clearRefreshCookie(): string {
  return serializeCookie(REFRESH_COOKIE_NAME, "", {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "Strict",
    maxAge: 0,
  });
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getRefreshTokenFromRequest(req: any): string | null {
  const cookies = parseCookies(req.headers?.cookie);
  return cookies[REFRESH_COOKIE_NAME] ?? null;
}

function setCookieHeader(res: any, value: string) {
  res.setHeader("Set-Cookie", value);
}

function getRefreshExpiryDate(refreshToken: string): Date {
  const payload = verifyRefreshToken(refreshToken);

  if (!payload?.exp) {
    throw new Error("Refresh token missing expiry");
  }

  return new Date(payload.exp * 1000);
}

function buildClaims(user: { id: number; username: string }): AuthTokenClaims {
  return {
    userId: user.id,
    username: user.username,
    role: "user",
  };
}

async function issueRefreshSession(
  client: Client,
  claims: AuthTokenClaims,
): Promise<{ accessToken: string; refreshToken: string }> {
  const sessionId = generateRefreshSessionId();
  const accessToken = createAccessToken(claims);
  const refreshToken = createRefreshToken(claims, sessionId);

  await createRefreshSession(client, {
    sessionId,
    userId: claims.userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshExpiryDate(refreshToken),
  });

  return { accessToken, refreshToken };
}

export async function handleLogin(
  req: any,
  res: any,
  client: Client,
): Promise<void> {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
      return;
    }

    const result = await client.query(
      "SELECT id, username, password FROM users WHERE username = $1",
      [username],
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    const { accessToken, refreshToken } = await issueRefreshSession(
      client,
      buildClaims(user),
    );

    setCookieHeader(res, createRefreshCookie(refreshToken));
    res.json({
      success: true,
      token: accessToken,
      accessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

export async function handleRefresh(
  req: any,
  res: any,
  client: Client,
): Promise<void> {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      res.status(401).json({ success: false, error: "Refresh token required" });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload?.sessionId) {
      setCookieHeader(res, clearRefreshCookie());
      res.status(403).json({ success: false, error: "Invalid refresh token" });
      return;
    }

    const session = await getRefreshSession(client, payload.sessionId);
    const refreshTokenHash = hashRefreshToken(refreshToken);

    if (
      !session
      || session.user_id !== payload.userId
      || session.token_hash !== refreshTokenHash
      || !isRefreshSessionActive(session)
    ) {
      await revokeRefreshSession(client, payload.sessionId);
      setCookieHeader(res, clearRefreshCookie());
      res.status(403).json({ success: false, error: "Refresh session is invalid" });
      return;
    }

    const claims: AuthTokenClaims = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };

    const accessToken = createAccessToken(claims);
    const nextRefreshToken = createRefreshToken(claims, payload.sessionId);

    await rotateRefreshSession(client, {
      sessionId: payload.sessionId,
      tokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: getRefreshExpiryDate(nextRefreshToken),
    });

    setCookieHeader(res, createRefreshCookie(nextRefreshToken));
    res.json({
      success: true,
      token: accessToken,
      accessToken,
      user: {
        id: payload.userId,
        username: payload.username,
      },
    });
  } catch (error: any) {
    console.error("Refresh error:", error);
    setCookieHeader(res, clearRefreshCookie());
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

export async function handleLogout(
  req: any,
  res: any,
  client: Client,
): Promise<void> {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload?.sessionId) {
      await revokeRefreshSession(client, payload.sessionId);
    }
  }

  setCookieHeader(res, clearRefreshCookie());
  res.status(204).send();
}

export function ensureAuthenticatedUserMatchesParam(
  paramName: string = "userid",
) {
  return (req: any, res: any, next: any) => {
    const authenticatedUserId = req.user?.userId;
    const requestedUserId = Number(req.params?.[paramName]);

    if (!authenticatedUserId || Number.isNaN(requestedUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (authenticatedUserId !== requestedUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

