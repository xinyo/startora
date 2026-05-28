import axios from "axios";
import { API_URL } from "@/server/api/base-url";

let accessToken = "";
let refreshInFlight: Promise<string | null> | null = null;

function readAccessToken(response: any): string | null {
  const token = response?.data?.accessToken ?? response?.data?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = "";
}

export function hasAccessToken(): boolean {
  return accessToken.length > 0;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const token = readAccessToken(response);

      if (!token) {
        clearAccessToken();
        return null;
      }

      setAccessToken(token);
      return token;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function logoutSession(): Promise<void> {
  try {
    await axios.post(
      `${API_URL}/auth/logout`,
      {},
      { withCredentials: true },
    );
  } finally {
    clearAccessToken();
  }
}
