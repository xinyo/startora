import bcrypt from "bcrypt";
import { Client } from "pg";
import { createAccessToken, verifyAccessToken } from "./auth/tokens";
import { handleLogin as handleSessionLogin } from "./auth/service";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
  };
  error?: string;
}

export interface AuthMiddlewareRequest {
  user?: {
    userId: number;
    username: string;
    role: string;
  };
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(
  userId: number,
  username: string,
  role: string = "user",
): string {
  return createAccessToken(
    {
      userId,
      username,
      role,
    },
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): any {
  const payload = verifyAccessToken(token);

  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  };
}

/**
 * Authentication middleware to protect routes
 */
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Attach user info to request object
  req.user = decoded;
  next();
}

/**
 * Handle login request - validates credentials and returns JWT token
 */
export async function handleLogin(
  req: any,
  res: any,
  client: Client,
): Promise<void> {
  return handleSessionLogin(req, res, client);
}

export async function legacyHandleLogin(
  req: any,
  res: any,
  client: Client,
): Promise<void> {
  try {
    const { username, password }: LoginRequest = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
      return;
    }

    // Query database for user
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

    // Compare password with hashed password in database
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username, "user");

    // Send response with token and user info
    res.json({
      success: true,
      token,
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
