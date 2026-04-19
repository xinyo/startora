import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

export type AuthTokenType = "access" | "refresh";

export interface AuthTokenClaims {
  userId: number;
  username: string;
  role: string;
}

export interface AuthTokenPayload extends AuthTokenClaims {
  tokenType: AuthTokenType;
  sessionId?: string;
  tokenId?: string;
  exp?: number;
  iat?: number;
}

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = "15m";
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = "7d";

function getSecret(tokenType: AuthTokenType): string {
  if (tokenType === "access") {
    return process.env.ACCESS_TOKEN_SECRET
      || process.env.JWT_SECRET
      || "dev-access-secret";
  }

  return process.env.REFRESH_TOKEN_SECRET
    || process.env.JWT_SECRET
    || "dev-refresh-secret";
}

function getExpiresIn(tokenType: AuthTokenType): SignOptions["expiresIn"] {
  if (tokenType === "access") {
    return process.env.ACCESS_TOKEN_EXPIRES_IN || DEFAULT_ACCESS_TOKEN_EXPIRES_IN;
  }

  return process.env.REFRESH_TOKEN_EXPIRES_IN || DEFAULT_REFRESH_TOKEN_EXPIRES_IN;
}

function signToken(
  tokenType: AuthTokenType,
  claims: AuthTokenClaims,
  options?: {
    expiresIn?: SignOptions["expiresIn"];
    sessionId?: string;
    tokenId?: string;
  },
): string {
  const payload: AuthTokenPayload = {
    ...claims,
    tokenType,
  };

  if (options?.sessionId) {
    payload.sessionId = options.sessionId;
  }

  if (options?.tokenId) {
    payload.tokenId = options.tokenId;
  }

  return jwt.sign(payload, getSecret(tokenType), {
    expiresIn: options?.expiresIn ?? getExpiresIn(tokenType),
  });
}

function verifyToken(
  tokenType: AuthTokenType,
  token: string,
): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret(tokenType));

    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    const payload = decoded as Partial<AuthTokenPayload>;

    if (payload.tokenType !== tokenType) {
      return null;
    }

    if (
      typeof payload.userId !== "number"
      || typeof payload.username !== "string"
      || typeof payload.role !== "string"
    ) {
      return null;
    }

    if (payload.sessionId !== undefined && typeof payload.sessionId !== "string") {
      return null;
    }

    if (payload.tokenId !== undefined && typeof payload.tokenId !== "string") {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function createAccessToken(
  claims: AuthTokenClaims,
  options?: { expiresIn?: SignOptions["expiresIn"] },
): string {
  return signToken("access", claims, options);
}

export function createRefreshToken(
  claims: AuthTokenClaims,
  sessionId: string,
  options?: { expiresIn?: SignOptions["expiresIn"] },
): string {
  return signToken("refresh", claims, {
    ...options,
    sessionId,
    tokenId: crypto.randomUUID(),
  });
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  return verifyToken("access", token);
}

export function verifyRefreshToken(token: string): AuthTokenPayload | null {
  return verifyToken("refresh", token);
}

export function generateRefreshSessionId(): string {
  return crypto.randomUUID();
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
