import { Client } from "pg";

export interface RefreshSessionRecord {
  session_id: string;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
  last_used_at?: Date;
}

export async function createRefreshSession(
  client: Client,
  session: {
    sessionId: string;
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO refresh_sessions (session_id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [session.sessionId, session.userId, session.tokenHash, session.expiresAt],
  );
}

export async function getRefreshSession(
  client: Client,
  sessionId: string,
): Promise<RefreshSessionRecord | null> {
  const result = await client.query(
    `SELECT session_id, user_id, token_hash, expires_at, revoked_at, created_at, updated_at, last_used_at
     FROM refresh_sessions
     WHERE session_id = $1`,
    [sessionId],
  );

  return (result.rows[0] as RefreshSessionRecord | undefined) ?? null;
}

export async function rotateRefreshSession(
  client: Client,
  session: {
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  },
): Promise<void> {
  await client.query(
    `UPDATE refresh_sessions
     SET token_hash = $2,
         expires_at = $3,
         revoked_at = NULL,
         updated_at = NOW(),
         last_used_at = NOW()
     WHERE session_id = $1`,
    [session.sessionId, session.tokenHash, session.expiresAt],
  );
}

export async function revokeRefreshSession(
  client: Client,
  sessionId: string,
): Promise<void> {
  await client.query(
    `UPDATE refresh_sessions
     SET revoked_at = NOW(),
         updated_at = NOW()
     WHERE session_id = $1`,
    [sessionId],
  );
}

export function isRefreshSessionActive(
  session: Pick<RefreshSessionRecord, "expires_at" | "revoked_at">,
  now: Date = new Date(),
): boolean {
  return session.revoked_at === null && session.expires_at.getTime() > now.getTime();
}

